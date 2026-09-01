import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoansService } from '../../src/modules/loans/loans.service.js';

function fakeRepository(options = {}) {
  const movements = [];
  const lockedIds = [];
  const transitions = [];
  let created;
  return {
    movements, lockedIds, transitions,
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
    addDetails: async () => {},
    addMovement: async (_tx, movement) => movements.push(movement),
    lockLoan: async () => options.missingLoan ? null : ({ id: 10, cliente_id: 8, estado: options.loanState || 'pendiente' }),
    getDetails: async () => [{ id: 30, libro_id: 1, titulo: 'Libro 1', cantidad_solicitada: 1, cantidad_devuelta: 0 }],
    approveForPickup: async (_tx, loanId, staffId) => transitions.push({ action: 'approve', loanId, staffId }),
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

test('la solicitud posterior queda rechazada cuando ya se comprometió el último ejemplar', async () => {
  const repository = fakeRepository({ totals: { 1: 1, 2: 2 }, committed: { 1: 1 } });
  const result = await createLoansService(repository).createClientRequest({ items: payload.items }, { cliente_id: 8 });
  assert.equal(result.rejected, true);
  assert.equal(result.loan.estado, 'rechazado');
  assert.equal(repository.movements[0].tipo, 'rechazo_solicitud');
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

test('aprobar una solicitud la deja lista para retiro y genera su movimiento', async () => {
  const repository = fakeRepository();
  const result = await createLoansService(repository).approve(
    10,
    { id: 4, rol: 'bibliotecario', nombre_completo: 'María Bibliotecaria' },
  );
  assert.equal(result.estado, 'listo_retiro');
  assert.deepEqual(repository.transitions[0], { action: 'approve', loanId: 10, staffId: 4 });
  assert.match(repository.movements[0].detalle, /lista para retiro/);
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
