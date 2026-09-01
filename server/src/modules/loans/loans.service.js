import { z } from 'zod';
import { ConflictError, NotFoundError, ValidationError } from '../../core/errors.js';
import { cleanText, normalizeDocument } from '../../core/validation.js';

const clientSchema = z.object({
    identificacion: z.string().transform(normalizeDocument).pipe(z.string()
      .regex(/^\d{10}$/, 'La cédula debe contener exactamente 10 dígitos numéricos.')),
    nombre_completo: z.string().transform(cleanText).pipe(z.string()
      .min(3, 'Ingresa el nombre completo del solicitante.')
      .max(180, 'El nombre no puede superar 180 caracteres.')
      .regex(/^[\p{L}]+(?:[\s.'’-][\p{L}]+)*$/u, 'El nombre solo puede contener letras, espacios, apóstrofes, puntos o guiones.')),
    telefono: z.string().optional().default('').transform(cleanText).pipe(z.string()
      .max(40, 'El teléfono no puede superar 40 caracteres.')
      .refine((value) => {
        if (!value) return true;
        return /^09\d{8}$/.test(value) || /^0[2-7]\d{7}$/.test(value);
      }, 'Ingresa un número ecuatoriano válido: celular de 10 dígitos (09…) o fijo de 9 dígitos.')),
    correo: z.string().optional().default('').transform((value) => cleanText(value).toLowerCase()).pipe(
      z.union([z.literal(''), z.email('Ingresa un correo electrónico válido.')]),
    ),
  });

const itemsSchema = z.object({
  items: z.array(z.object({
    libro_id: z.coerce.number().int().positive(),
    cantidad: z.coerce.number().int().positive(),
  })).min(1, 'Añade al menos un libro antes de enviar la solicitud.'),
}).superRefine((value, ctx) => {
  if (new Set(value.items.map((item) => item.libro_id)).size !== value.items.length) {
    ctx.addIssue({ code: 'custom', path: ['items'], message: 'Cada libro debe aparecer una sola vez.' });
  }
});

const requestSchema = z.object({ cliente: clientSchema }).and(itemsSchema).superRefine((value, ctx) => {
  if (!cleanText(value.cliente.telefono) && !cleanText(value.cliente.correo)) {
    ctx.addIssue({ code: 'custom', path: ['cliente', 'telefono'], message: 'Ingresa un teléfono o un correo para poder gestionar la solicitud.' });
  }
});

const returnSchema = z.object({
  items: z.array(z.object({
    detalle_id: z.coerce.number().int().positive(),
    cantidad: z.coerce.number().int().positive(),
  })).min(1),
});

const reviewSchema = z.object({
  items: z.array(z.object({
    detalle_id: z.coerce.number().int().positive(),
    cantidad_aprobada: z.coerce.number().int().nonnegative(),
    motivo_rechazo: z.string().optional().default('').transform(cleanText).pipe(
      z.string().max(500, 'La observación no puede superar 500 caracteres.'),
    ),
  })).min(1, 'Debe revisar todos los materiales pendientes.'),
}).superRefine((value, ctx) => {
  if (new Set(value.items.map((item) => item.detalle_id)).size !== value.items.length) {
    ctx.addIssue({ code: 'custom', path: ['items'], message: 'Cada material debe revisarse una sola vez.' });
  }
});

const directLoanSchema = requestSchema.and(z.object({
  fecha_limite: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha límite es obligatoria.'),
}));

function validateDueDate(dueDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dueDate || ''))) throw new ValidationError('La fecha límite es obligatoria.');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
  if (dueDate < today) throw new ValidationError('La fecha límite no puede ser anterior a hoy.');
}

export function createLoansService(repository) {
  return {
    async createClientRequest(payload, authenticatedClient) {
      const input = itemsSchema.parse(payload);
      input.items.sort((a, b) => a.libro_id - b.libro_id);

      return repository.transaction(async (tx) => {
        const client = await repository.findClientById(tx, authenticatedClient?.cliente_id);
        if (!client) throw new NotFoundError('Cliente no encontrado.');
        if (await repository.hasOpenLoan(tx, client.id)) {
          throw new ConflictError('El cliente tiene un préstamo listo para retiro, activo o atrasado.', 'CLIENT_BLOCKED');
        }

        const ids = input.items.map((item) => item.libro_id);
        const books = await repository.lockBooks(tx, ids);
        if (books.length !== ids.length) throw new ValidationError('Uno o más libros ya no existen en el catálogo.');
        const committed = await repository.getCommittedByBook(tx, ids);
        const reviewedItems = input.items.map((item) => {
          const book = books.find((candidate) => Number(candidate.id) === item.libro_id);
          const unavailable = !book.activo || Number(book.cantidad_total) - (committed.get(item.libro_id) || 0) < item.cantidad;
          return {
            ...item,
            cantidad_aprobada: unavailable ? 0 : null,
            motivo_rechazo: unavailable
              ? book.activo ? 'Rechazo automático por falta de disponibilidad.' : 'Rechazo automático porque el material ya no está activo.'
              : null,
          };
        });
        const unavailable = reviewedItems.filter((item) => item.cantidad_aprobada === 0);
        const pending = reviewedItems.filter((item) => item.cantidad_aprobada === null);
        const state = pending.length ? 'pendiente' : 'rechazado';
        const reason = pending.length ? null : 'Todos los materiales fueron rechazados automáticamente por falta de disponibilidad.';
        const loan = await repository.createLoan(tx, { clientId: client.id, state, reason });
        await repository.addDetails(tx, loan.id, reviewedItems);
        await repository.addMovement(tx, {
          tipo: pending.length ? 'prestamo' : 'rechazo_solicitud',
          tipo_actor: 'cliente',
          cliente_id: client.id,
          actor_nombre: client.nombre_completo,
          libro_id: reviewedItems.length === 1 ? reviewedItems[0].libro_id : null,
          prestamo_id: loan.id,
          detalle: pending.length
            ? `Solicitud registrada con ${pending.length} material(es) pendiente(s) de revisión${unavailable.length ? ` y ${unavailable.length} rechazado(s) automáticamente` : ''}.`
            : reason,
        });
        for (const item of unavailable) {
          await repository.addMovement(tx, {
            tipo: 'rechazo_solicitud', tipo_actor: 'cliente', cliente_id: client.id,
            actor_nombre: client.nombre_completo, libro_id: item.libro_id, prestamo_id: loan.id,
            detalle: item.motivo_rechazo,
          });
        }
        return {
          loan,
          rejected: !pending.length,
          partial: Boolean(pending.length && unavailable.length),
          pendingCount: pending.length,
          rejectedCount: unavailable.length,
        };
      });
    },
    async createDirectLoan(payload, staff) {
      const input = directLoanSchema.parse(payload);
      validateDueDate(input.fecha_limite);
      input.items.sort((a, b) => a.libro_id - b.libro_id);

      return repository.transaction(async (tx) => {
        const client = await repository.upsertClient(tx, input.cliente);
        if (await repository.hasOpenLoan(tx, client.id)) {
          throw new ConflictError('El cliente tiene un préstamo listo para retiro, activo o atrasado.', 'CLIENT_BLOCKED');
        }

        const ids = input.items.map((item) => item.libro_id);
        const books = await repository.lockBooks(tx, ids);
        if (books.length !== ids.length || books.some((book) => !book.activo)) {
          throw new ValidationError('Uno o más libros ya no están disponibles en el catálogo.');
        }
        const committed = await repository.getCommittedByBook(tx, ids);
        const unavailable = input.items.find((item) => {
          const book = books.find((candidate) => Number(candidate.id) === item.libro_id);
          return Number(book.cantidad_total) - (committed.get(item.libro_id) || 0) < item.cantidad;
        });
        if (unavailable) {
          const book = books.find((candidate) => Number(candidate.id) === unavailable.libro_id);
          throw new ConflictError(`No hay suficientes ejemplares disponibles de “${book?.titulo || 'el material seleccionado'}”.`, 'OUT_OF_STOCK');
        }

        const loan = await repository.createDirectLoan(tx, {
          clientId: client.id,
          staffId: staff.id,
          dueDate: input.fecha_limite,
        });
        await repository.addDetails(tx, loan.id, input.items.map((item) => ({
          ...item, cantidad_aprobada: item.cantidad, motivo_rechazo: null,
        })));
        await repository.addMovement(tx, {
          tipo: 'prestamo', tipo_actor: staff.rol, cuenta_personal_id: staff.id,
          actor_nombre: staff.nombre_completo, cliente_id: client.id, prestamo_id: loan.id,
          libro_id: input.items.length === 1 ? input.items[0].libro_id : null,
          detalle: `Préstamo directo registrado y entregado. Fecha límite: ${input.fecha_limite}.`,
        });
        return loan;
      });
    },
    list: (filters) => repository.list(filters),
    getClientStatus: async (code, clientId) => {
      const loan = await repository.getClientStatus(cleanText(code), clientId);
      if (!loan) throw new NotFoundError('No se encontró una solicitud con esos datos.');
      return loan;
    },
    async review(id, payload, staff) {
      const input = reviewSchema.parse(payload);
      return repository.transaction(async (tx) => {
        const loan = await repository.lockLoan(tx, id);
        if (!loan) throw new NotFoundError('Solicitud no encontrada.');
        if (loan.estado !== 'pendiente') throw new ConflictError('La solicitud ya fue procesada.', 'LOAN_ALREADY_PROCESSED');
        const details = await repository.getDetails(tx, loan.id, true);
        const pendingDetails = details.filter((detail) => detail.cantidad_aprobada === null);
        const expectedIds = new Set(pendingDetails.map((detail) => Number(detail.id)));
        if (input.items.length !== pendingDetails.length || input.items.some((item) => !expectedIds.has(item.detalle_id))) {
          throw new ValidationError('Debe decidir sobre todos los materiales pendientes de la solicitud.');
        }
        for (const decision of input.items) {
          const detail = pendingDetails.find((candidate) => Number(candidate.id) === decision.detalle_id);
          if (decision.cantidad_aprobada > Number(detail.cantidad_solicitada)) {
            throw new ValidationError(`No puede aprobar más unidades de “${detail.titulo}” que las solicitadas.`);
          }
        }
        const approved = input.items.filter((item) => item.cantidad_aprobada > 0);
        if (approved.length && await repository.hasOpenLoan(tx, loan.cliente_id, loan.id)) {
          throw new ConflictError('El cliente ya tiene otro préstamo listo para retiro, activo o atrasado.', 'CLIENT_BLOCKED');
        }
        if (approved.length) {
          const approvedBookIds = approved.map((decision) => Number(
            pendingDetails.find((detail) => Number(detail.id) === decision.detalle_id).libro_id,
          ));
          await repository.lockBooks(tx, approvedBookIds);
        }
        for (const decision of input.items) {
          const detail = pendingDetails.find((candidate) => Number(candidate.id) === decision.detalle_id);
          const reduced = decision.cantidad_aprobada > 0 && decision.cantidad_aprobada < Number(detail.cantidad_solicitada);
          const reviewNote = decision.cantidad_aprobada === 0 || reduced ? decision.motivo_rechazo : '';
          await repository.reviewDetail(tx, detail.id, decision.cantidad_aprobada, reviewNote);
          await repository.addMovement(tx, {
            tipo: decision.cantidad_aprobada > 0 ? 'prestamo' : 'rechazo_solicitud',
            tipo_actor: staff.rol, cuenta_personal_id: staff.id,
            actor_nombre: staff.nombre_completo, prestamo_id: loan.id, libro_id: detail.libro_id,
            detalle: decision.cantidad_aprobada > 0
              ? `Aprobadas ${decision.cantidad_aprobada} de ${detail.cantidad_solicitada} unidad(es) de “${detail.titulo}”${reduced && reviewNote ? `. Observación: ${reviewNote}` : ''}.`
              : `Material rechazado: “${detail.titulo}”${reviewNote ? `. Motivo: ${reviewNote}` : '.'}`,
          });
        }
        const state = approved.length ? 'listo_retiro' : 'rechazado';
        await repository.finishReview(tx, loan.id, staff.id, state,
          approved.length ? null : 'Todos los materiales fueron rechazados por el personal.');
        return {
          ...loan,
          estado: state,
          bibliotecario_id: staff.id,
          resumen: {
            aprobados: approved.length,
            rechazados: input.items.length - approved.length,
            unidades_aprobadas: approved.reduce((sum, item) => sum + item.cantidad_aprobada, 0),
          },
        };
      });
    },
    async deliver(id, dueDate, staff) {
      validateDueDate(dueDate);

      return repository.transaction(async (tx) => {
        const loan = await repository.lockLoan(tx, id);
        if (!loan) throw new NotFoundError('Préstamo no encontrado.');
        if (loan.estado !== 'listo_retiro') throw new ConflictError('El préstamo no está listo para retiro.', 'INVALID_LOAN_STATE');
        if (await repository.hasOpenLoan(tx, loan.cliente_id, loan.id)) {
          throw new ConflictError('El cliente ya tiene otro préstamo listo para retiro, activo o atrasado.', 'CLIENT_BLOCKED');
        }
        const details = (await repository.getDetails(tx, loan.id)).filter((detail) => Number(detail.cantidad_aprobada) > 0);
        if (!details.length) throw new ConflictError('El préstamo no tiene materiales aprobados para entregar.', 'INVALID_LOAN_STATE');
        await repository.lockBooks(tx, details.map((detail) => Number(detail.libro_id)));
        await repository.deliver(tx, loan.id, staff.id, dueDate);
        await repository.addMovement(tx, {
          tipo: 'prestamo', tipo_actor: staff.rol, cuenta_personal_id: staff.id,
          actor_nombre: staff.nombre_completo, prestamo_id: loan.id,
          libro_id: details.length === 1 ? details[0].libro_id : null,
          detalle: `Material entregado. Fecha límite: ${dueDate}.`,
        });
        return { ...loan, estado: 'activo', fecha_limite: dueDate, bibliotecario_id: staff.id };
      });
    },
    async registerReturn(id, payload, staff) {
      const input = returnSchema.parse(payload);
      return repository.transaction(async (tx) => {
        const loan = await repository.lockLoan(tx, id);
        if (!loan) throw new NotFoundError('Préstamo no encontrado.');
        if (!['activo', 'atrasado'].includes(loan.estado)) throw new ConflictError('El préstamo no admite devoluciones.', 'INVALID_LOAN_STATE');
        const details = await repository.getDetails(tx, loan.id, true);
        for (const item of input.items) {
          const detail = details.find((candidate) => Number(candidate.id) === item.detalle_id);
          if (!detail) throw new ValidationError('Una línea no pertenece al préstamo.');
          if (Number(detail.cantidad_aprobada) <= 0) throw new ValidationError('No puede devolver un material que no fue aprobado.');
          if (Number(detail.cantidad_devuelta) + item.cantidad > Number(detail.cantidad_aprobada)) {
            throw new ValidationError(`La devolución de “${detail.titulo}” supera la cantidad pendiente.`);
          }
        }
        for (const item of input.items) {
          const detail = details.find((candidate) => Number(candidate.id) === item.detalle_id);
          await repository.updateReturnedQuantity(tx, detail.id, item.cantidad);
          await repository.addMovement(tx, {
            tipo: 'devolucion', tipo_actor: staff.rol, cuenta_personal_id: staff.id,
            actor_nombre: staff.nombre_completo, libro_id: detail.libro_id, prestamo_id: loan.id,
            detalle: `Devolución de ${item.cantidad} unidad(es) de “${detail.titulo}”.`,
          });
          detail.cantidad_devuelta = Number(detail.cantidad_devuelta) + item.cantidad;
        }
        const approvedDetails = details.filter((detail) => Number(detail.cantidad_aprobada) > 0);
        const complete = approvedDetails.every((detail) => Number(detail.cantidad_devuelta) === Number(detail.cantidad_aprobada));
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
        const state = complete ? 'devuelto' : String(loan.fecha_limite) < today ? 'atrasado' : 'activo';
        await repository.setLoanState(tx, loan.id, state);
        return { id: loan.id, estado: state };
      });
    },
    markOverdue: () => repository.markOverdue(),
  };
}
