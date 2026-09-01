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
    cantidad: z.coerce.number().int().positive().max(100),
  })).min(1, 'Añade al menos un libro antes de enviar la solicitud.').max(20, 'Una solicitud admite hasta 20 libros.'),
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
        if (books.length !== ids.length || books.some((book) => !book.activo)) {
          throw new ValidationError('Uno o más libros ya no están disponibles en el catálogo.');
        }
        const committed = await repository.getCommittedByBook(tx, ids);
        const unavailable = input.items.find((item) => {
          const book = books.find((candidate) => Number(candidate.id) === item.libro_id);
          return Number(book.cantidad_total) - (committed.get(item.libro_id) || 0) < item.cantidad;
        });

        const state = unavailable ? 'rechazado' : 'pendiente';
        const reason = unavailable ? 'Rechazo automático por falta de disponibilidad.' : null;
        const loan = await repository.createLoan(tx, { clientId: client.id, state, reason });
        await repository.addDetails(tx, loan.id, input.items);
        await repository.addMovement(tx, {
          tipo: unavailable ? 'rechazo_solicitud' : 'prestamo',
          tipo_actor: 'cliente',
          cliente_id: client.id,
          actor_nombre: client.nombre_completo,
          libro_id: unavailable?.libro_id || (input.items.length === 1 ? input.items[0].libro_id : null),
          prestamo_id: loan.id,
          detalle: unavailable ? reason : 'Solicitud de préstamo registrada.',
        });
        return { loan, rejected: Boolean(unavailable) };
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
        await repository.addDetails(tx, loan.id, input.items);
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
    async approve(id, staff) {
      return repository.transaction(async (tx) => {
        const loan = await repository.lockLoan(tx, id);
        if (!loan) throw new NotFoundError('Solicitud no encontrada.');
        if (loan.estado !== 'pendiente') throw new ConflictError('La solicitud ya fue procesada.', 'LOAN_ALREADY_PROCESSED');
        if (await repository.hasOpenLoan(tx, loan.cliente_id, loan.id)) {
          throw new ConflictError('El cliente ya tiene otro préstamo listo para retiro, activo o atrasado.', 'CLIENT_BLOCKED');
        }
        const details = await repository.getDetails(tx, loan.id);
        await repository.approveForPickup(tx, loan.id, staff.id);
        await repository.addMovement(tx, {
          tipo: 'prestamo', tipo_actor: staff.rol, cuenta_personal_id: staff.id,
          actor_nombre: staff.nombre_completo, prestamo_id: loan.id,
          libro_id: details.length === 1 ? details[0].libro_id : null,
          detalle: 'Solicitud aprobada y lista para retiro.',
        });
        return { ...loan, estado: 'listo_retiro', bibliotecario_id: staff.id };
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
        const details = await repository.getDetails(tx, loan.id);
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
    async reject(id, reason, staff) {
      return repository.transaction(async (tx) => {
        const loan = await repository.lockLoan(tx, id);
        if (!loan) throw new NotFoundError('Solicitud no encontrada.');
        if (loan.estado !== 'pendiente') throw new ConflictError('La solicitud ya fue procesada.', 'LOAN_ALREADY_PROCESSED');
        const details = await repository.getDetails(tx, loan.id);
        await repository.reject(tx, loan.id, staff.id, cleanText(reason));
        await repository.addMovement(tx, {
          tipo: 'rechazo_solicitud', tipo_actor: staff.rol, cuenta_personal_id: staff.id,
          actor_nombre: staff.nombre_completo, prestamo_id: loan.id,
          libro_id: details.length === 1 ? details[0].libro_id : null,
          detalle: cleanText(reason) || 'Solicitud rechazada por el personal.',
        });
        return { ...loan, estado: 'rechazado' };
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
          if (Number(detail.cantidad_devuelta) + item.cantidad > Number(detail.cantidad_solicitada)) {
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
        const complete = details.every((detail) => Number(detail.cantidad_devuelta) === Number(detail.cantidad_solicitada));
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date());
        const state = complete ? 'devuelto' : String(loan.fecha_limite) < today ? 'atrasado' : 'activo';
        await repository.setLoanState(tx, loan.id, state);
        return { id: loan.id, estado: state };
      });
    },
    markOverdue: () => repository.markOverdue(),
  };
}
