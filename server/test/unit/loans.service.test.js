import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoansService } from '../../src/modules/loans/loans.service.js';

function fakeRepository(options = {}) {
  const movements = [];
  const lockedIds = [];
  const transitions = [];
  const addedDetails = [];
  let created;
  return {
    movements, lockedIds, transitions, addedDetails,
    transaction: (callback) => callback({}),
    findClientById: async () => ({ id: 8, identificacion: '1300000000', nombre_completo: 'Ana Lectora' }),
    upsertClient: async () => ({ id: 8, identificacion: '1300000000', nombre_completo: 'Ana Lectora' }),
    hasOpenLoan: async () => Boolean(options.blocked),
    lockBooks: async (_tx, ids) => {
      lockedIds.push(...ids);
      return ids.map((id) => ({ id, titulo: `Libro ${id}`, cantidad_total: options.totals?.[id] ?? 1, activo: true }));
    },
    getCommittedByBook: async () => new Map(Object.entries(options.committed || {}).map(([id, quantity]) => [Number(id), quantity])),
    createLoan: async (_tx, input) => (created = { id: 10, codigo: 'SOL-ABC123', estado: input.state }),
    createDirectLoan: async (_tx, input) => (created = { id: 11, codigo: 'SOL-DIRECTO', estado: 'activo', ...input }),
    addDetails: async (_tx, _loanId, items) => addedDetails.push(...items),
    addMovement: async (_tx, movement) => movements.push(movement),
    lockLoan: async () => options.missingLoan ? null : ({ id: 10, cliente_id: 8, estado: options.loanState || 'pendiente' }),
    getDetails: async () => options.details || [{ id: 30, libro_id: 1, titulo: 'Libro 1', cantidad_solicitada: 1, cantidad_aprobada: options.loanState === 'listo_retiro' ? 1 : null, cantidad_devuelta: 0 }],
    reviewDetail: async (_tx, detailId, approvedQuantity, reason) => transitions.push({ action: 'review-detail', detailId, approvedQuantity, reason }),
    finishReview: async (_tx, loanId, staffId, state, reason) => transitions.push({ action: 'finish-review', loanId, staffId, state, reason }),
    deliver: async (_tx, loanId, staffId, dueDate) => transitions.push({ action: 'deliver', loanId, staffId, dueDate }),
    get created() { return created; },
  };
}

const payload = {
  cliente: { identificacion: '1300000000', nombre_completo: 'Ana Lectora', telefono: '0990000000', correo: '' },
  items: [{ libro_id: 2, cantidad: 1 }, { libro_id: 1, cantidad: 1 }],
};

test('la solicitud autenticada aparta unidades y bloquea los libros en orden estable', async () => {
  const repository = fakeRepository({ totals: { 1: 1, 2: 2 } });
  const result = await createLoansService(repository).createClientRequest({ items: payload.items }, { cliente_id: 8 });
  assert.equal(result.rejected, false);
  assert.equal(result.loan.estado, 'pendiente');
  assert.deepEqual(repository.lockedIds, [1, 2]);
  assert.equal(repository.movements[0].tipo, 'prestamo');
  assert.equal(repository.movements[0].tipo_actor, 'cliente');
});

test('una solicitud mixta conserva disponibles y rechaza solo el material agotado', async () => {
  const repository = fakeRepository({ totals: { 1: 1, 2: 2 }, committed: { 1: 1 } });
  const result = await createLoansService(repository).createClientRequest({ items: payload.items }, { cliente_id: 8 });
  assert.equal(result.rejected, false);
  assert.equal(result.partial, true);
  assert.equal(result.loan.estado, 'pendiente');
  assert.equal(repository.addedDetails.find((item) => item.libro_id === 1).cantidad_aprobada, 0);
  assert.equal(repository.addedDetails.find((item) => item.libro_id === 2).cantidad_aprobada, null);
  assert.ok(repository.movements.some((movement) => movement.tipo === 'rechazo_solicitud' && movement.libro_id === 1));
});

test('la solicitud queda rechazada solo cuando ninguno de sus materiales está disponible', async () => {
  const repository = fakeRepository({ totals: { 1: 1, 2: 1 }, committed: { 1: 1, 2: 1 } });
  const result = await createLoansService(repository).createClientRequest({ items: payload.items }, { cliente_id: 8 });
  assert.equal(result.rejected, true);
  assert.equal(result.loan.estado, 'rechazado');
  assert.equal(result.rejectedCount, 2);
});

test('no impone un máximo funcional de títulos por solicitud', async () => {
  const repository = fakeRepository();
  const items = Array.from({ length: 75 }, (_, index) => ({ libro_id: index + 1, cantidad: 1 }));
  const result = await createLoansService(repository).createClientRequest({ items }, { cliente_id: 8 });
  assert.equal(result.loan.estado, 'pendiente');
  assert.equal(repository.addedDetails.length, 75);
});

test('un cliente con préstamo abierto no puede crear otra solicitud', async () => {
  const repository = fakeRepository({ blocked: true });
  await assert.rejects(
    createLoansService(repository).createClientRequest({ items: payload.items }, { cliente_id: 8 }),
    (error) => error.code === 'CLIENT_BLOCKED' && error.status === 409,
  );
});

test('el préstamo directo requiere al menos un medio de contacto', async () => {
  const repository = fakeRepository();
  await assert.rejects(
    createLoansService(repository).createDirectLoan({ ...payload, cliente: { ...payload.cliente, telefono: '', correo: '' }, fecha_limite: '2099-12-31' }, { id: 4, rol: 'bibliotecario', nombre_completo: 'María' }),
    (error) => error.name === 'ZodError',
  );
});

test('rechaza cédula que no tenga exactamente 10 dígitos y nombre vacío', async () => {
  const repository = fakeRepository();
  await assert.rejects(
    createLoansService(repository).createDirectLoan({
      ...payload,
      cliente: { ...payload.cliente, identificacion: '   ', nombre_completo: '   ' },
      fecha_limite: '2099-12-31',
    }, { id: 4, rol: 'bibliotecario', nombre_completo: 'María' }),
    (error) => error.name === 'ZodError'
      && error.issues.some((issue) => issue.path.join('.') === 'cliente.identificacion')
      && error.issues.some((issue) => issue.path.join('.') === 'cliente.nombre_completo'),
  );
});

test('rechaza un teléfono con formato inválido', async () => {
  const repository = fakeRepository();
  await assert.rejects(
    createLoansService(repository).createDirectLoan({
      ...payload,
      cliente: { ...payload.cliente, telefono: '12-AB', correo: '' },
      fecha_limite: '2099-12-31',
    }, { id: 4, rol: 'bibliotecario', nombre_completo: 'María' }),
    (error) => error.name === 'ZodError'
      && error.issues.some((issue) => issue.path.join('.') === 'cliente.telefono'),
  );
});

test('rechaza números en el nombre completo', async () => {
  const repository = fakeRepository();
  await assert.rejects(
    createLoansService(repository).createDirectLoan({
      ...payload,
      cliente: { ...payload.cliente, nombre_completo: 'Ana Lectora 2' },
      fecha_limite: '2099-12-31',
    }, { id: 4, rol: 'bibliotecario', nombre_completo: 'María' }),
    (error) => error.name === 'ZodError'
      && error.issues.some((issue) => issue.path.join('.') === 'cliente.nombre_completo'),
  );
});

test('registra un préstamo directo activo con personal y fecha límite', async () => {
  const repository = fakeRepository({ totals: { 1: 2, 2: 2 } });
  const result = await createLoansService(repository).createDirectLoan(
    { ...payload, fecha_limite: '2099-12-31' },
    { id: 4, rol: 'bibliotecario', nombre_completo: 'María Bibliotecaria' },
  );
  assert.equal(result.estado, 'activo');
  assert.equal(result.staffId, 4);
  assert.ok(repository.addedDetails.every((item) => item.cantidad_aprobada === item.cantidad));
  assert.equal(repository.movements[0].tipo_actor, 'bibliotecario');
  assert.match(repository.movements[0].detalle, /Préstamo directo/);
});

test('el préstamo directo no se registra cuando falta disponibilidad', async () => {
  const repository = fakeRepository({ totals: { 1: 1, 2: 2 }, committed: { 1: 1 } });
  await assert.rejects(
    createLoansService(repository).createDirectLoan(
      { ...payload, fecha_limite: '2099-12-31' },
      { id: 4, rol: 'bibliotecario', nombre_completo: 'María Bibliotecaria' },
    ),
    (error) => error.code === 'OUT_OF_STOCK' && error.status === 409,
  );
});

test('la revisión permite aprobar algunos materiales, reducir cantidades y rechazar otros', async () => {
  const repository = fakeRepository({ details: [
    { id: 30, libro_id: 1, titulo: 'Libro 1', cantidad_solicitada: 3, cantidad_aprobada: null, cantidad_devuelta: 0 },
    { id: 31, libro_id: 2, titulo: 'Libro 2', cantidad_solicitada: 1, cantidad_aprobada: null, cantidad_devuelta: 0 },
  ] });
  const result = await createLoansService(repository).review(
    10,
    { items: [
      { detalle_id: 30, cantidad_aprobada: 1, motivo_rechazo: 'Se presta una unidad por persona.' },
      { detalle_id: 31, cantidad_aprobada: 0, motivo_rechazo: 'Material en reparación.' },
    ] },
    { id: 4, rol: 'bibliotecario', nombre_completo: 'María Bibliotecaria' },
  );
  assert.equal(result.estado, 'listo_retiro');
  assert.deepEqual(result.resumen, { aprobados: 1, rechazados: 1, unidades_aprobadas: 1 });
  assert.ok(repository.transitions.some((transition) => transition.action === 'review-detail' && transition.detailId === 30 && transition.approvedQuantity === 1));
  assert.ok(repository.transitions.some((transition) => transition.action === 'finish-review' && transition.state === 'listo_retiro'));
  assert.equal(repository.movements.filter((movement) => movement.tipo === 'prestamo').length, 1);
  assert.equal(repository.movements.filter((movement) => movement.tipo === 'rechazo_solicitud').length, 1);
});

test('si el personal rechaza todas las líneas la solicitud completa queda rechazada', async () => {
  const repository = fakeRepository();
  const result = await createLoansService(repository).review(
    10,
    { items: [{ detalle_id: 30, cantidad_aprobada: 0, motivo_rechazo: 'No procede.' }] },
    { id: 4, rol: 'bibliotecario', nombre_completo: 'María Bibliotecaria' },
  );
  assert.equal(result.estado, 'rechazado');
  assert.ok(repository.transitions.some((transition) => transition.action === 'finish-review' && transition.state === 'rechazado'));
});

test('la revisión exige decidir todas las líneas pendientes', async () => {
  const repository = fakeRepository({ details: [
    { id: 30, libro_id: 1, titulo: 'Libro 1', cantidad_solicitada: 1, cantidad_aprobada: null, cantidad_devuelta: 0 },
    { id: 31, libro_id: 2, titulo: 'Libro 2', cantidad_solicitada: 1, cantidad_aprobada: null, cantidad_devuelta: 0 },
  ] });
  await assert.rejects(
    createLoansService(repository).review(
      10,
      { items: [{ detalle_id: 30, cantidad_aprobada: 1 }] },
      { id: 4, rol: 'bibliotecario', nombre_completo: 'María Bibliotecaria' },
    ),
    (error) => error.code === 'VALIDATION_ERROR' && error.status === 422,
  );
});

test('registrar el retiro activa el préstamo y define la fecha límite', async () => {
  const repository = fakeRepository({ loanState: 'listo_retiro' });
  const result = await createLoansService(repository).deliver(
    10,
    '2099-12-31',
    { id: 4, rol: 'bibliotecario', nombre_completo: 'María Bibliotecaria' },
  );
  assert.equal(result.estado, 'activo');
  assert.equal(result.fecha_limite, '2099-12-31');
  assert.deepEqual(repository.transitions[0], { action: 'deliver', loanId: 10, staffId: 4, dueDate: '2099-12-31' });
  assert.match(repository.movements[0].detalle, /Material entregado/);
});

test('no permite registrar entrega antes de aprobar la solicitud', async () => {
  const repository = fakeRepository({ loanState: 'pendiente' });
  await assert.rejects(
    createLoansService(repository).deliver(
      10,
      '2099-12-31',
      { id: 4, rol: 'bibliotecario', nombre_completo: 'María Bibliotecaria' },
    ),
    (error) => error.code === 'INVALID_LOAN_STATE' && error.status === 409,
  );
});
