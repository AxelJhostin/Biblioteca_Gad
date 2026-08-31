import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoansService } from '../../src/modules/loans/loans.service.js';

function fakeRepository(options = {}) {
  const movements = [];
  const lockedIds = [];
  let created;
  return {
    movements, lockedIds,
    transaction: (callback) => callback({}),
    upsertClient: async () => ({ id: 8, identificacion: '1300000000', nombre_completo: 'Ana Lectora' }),
    hasOpenLoan: async () => Boolean(options.blocked),
    lockBooks: async (_tx, ids) => {
      lockedIds.push(...ids);
      return ids.map((id) => ({ id, titulo: `Libro ${id}`, cantidad_total: options.totals?.[id] ?? 1, activo: true }));
    },
    getCommittedByBook: async () => new Map(Object.entries(options.committed || {}).map(([id, quantity]) => [Number(id), quantity])),
    createLoan: async (_tx, input) => (created = { id: 10, codigo: 'SOL-ABC123', estado: input.state }),
    addDetails: async () => {},
    addMovement: async (_tx, movement) => movements.push(movement),
    get created() { return created; },
  };
}

const payload = {
  cliente: { identificacion: '1300000000', nombre_completo: 'Ana Lectora', telefono: '0990000000', correo: '' },
  items: [{ libro_id: 2, cantidad: 1 }, { libro_id: 1, cantidad: 1 }],
};

test('la solicitud válida aparta unidades y bloquea los libros en orden estable', async () => {
  const repository = fakeRepository({ totals: { 1: 1, 2: 2 } });
  const result = await createLoansService(repository).createRequest(payload);
  assert.equal(result.rejected, false);
  assert.equal(result.loan.estado, 'pendiente');
  assert.deepEqual(repository.lockedIds, [1, 2]);
  assert.equal(repository.movements[0].tipo, 'prestamo');
  assert.equal(repository.movements[0].tipo_actor, 'cliente');
});

test('la solicitud posterior queda rechazada cuando ya se comprometió el último ejemplar', async () => {
  const repository = fakeRepository({ totals: { 1: 1, 2: 2 }, committed: { 1: 1 } });
  const result = await createLoansService(repository).createRequest(payload);
  assert.equal(result.rejected, true);
  assert.equal(result.loan.estado, 'rechazado');
  assert.equal(repository.movements[0].tipo, 'rechazo_solicitud');
});

test('un cliente con préstamo abierto no puede crear otra solicitud', async () => {
  const repository = fakeRepository({ blocked: true });
  await assert.rejects(
    createLoansService(repository).createRequest(payload),
    (error) => error.code === 'CLIENT_BLOCKED' && error.status === 409,
  );
});

test('requiere al menos un medio de contacto', async () => {
  const repository = fakeRepository();
  await assert.rejects(
    createLoansService(repository).createRequest({ ...payload, cliente: { ...payload.cliente, telefono: '', correo: '' } }),
    (error) => error.name === 'ZodError',
  );
});

