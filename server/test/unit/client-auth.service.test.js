import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { createClientAuthService } from '../../src/modules/client-auth/client-auth.service.js';

const secret = 'secreto-de-pruebas-suficientemente-largo';

function validRegistration() {
  return {
    identificacion: '1301000099',
    nombre_completo: 'Ana Lectora',
    telefono: '0991000099',
    correo: '',
    password: 'Segura#2026',
    confirmar_password: 'Segura#2026',
  };
}

test('registra cliente y cuenta en una única transacción', async () => {
  let transactionUsed = false;
  let storedHash = '';
  const repository = {
    transaction: async (callback) => { transactionUsed = true; return callback({}); },
    findClientForUpdate: async () => null,
    createClient: async (_tx, input) => ({ id: 8, ...input }),
    createAccount: async (_tx, input) => { storedHash = input.passwordHash; return { id: 3, cliente_id: 8, estado: true, debe_cambiar_password: false, version_sesion: 1 }; },
  };
  const service = createClientAuthService({ repository, jwtSecret: secret, jwtTtl: 3600 });
  const result = await service.register(validRegistration());
  assert.equal(transactionUsed, true);
  assert.equal(result.user.cliente_id, 8);
  assert.equal(result.user.id, 3);
  assert.equal(result.user.rol, 'cliente');
  assert.equal(await bcrypt.compare('Segura#2026', storedHash), true);
  assert.equal(service.verify(result.token).type, 'cliente');
});

test('inicia sesión y rechaza tokens con versión anterior', async () => {
  const hash = await bcrypt.hash('Segura#2026', 4);
  let marked = false;
  const account = {
    id: 3, cliente_id: 8, identificacion: '1301000099', nombre_completo: 'Ana Lectora',
    telefono: '0991000099', correo: null, password_hash: hash, estado: true,
    debe_cambiar_password: false, version_sesion: 2, bloqueado_hasta: null,
  };
  const repository = {
    findAccountByIdentification: async () => account,
    markLogin: async () => { marked = true; },
    recordFailedAttempt: async () => {},
    findActiveById: async () => account,
  };
  const service = createClientAuthService({ repository, jwtSecret: secret, jwtTtl: 3600 });
  const result = await service.login({ identificacion: '1301000099', password: 'Segura#2026' });
  assert.equal(marked, true);
  assert.equal((await service.getSessionAccount(service.verify(result.token))).cliente_id, 8);
  assert.equal(await service.getSessionAccount({ sub: '3', role: 'cliente', type: 'cliente', ver: 1 }), null);
});

test('activa un cliente histórico sin crear otro registro de cliente', async () => {
  let createdClientAccount;
  const repository = {
    transaction: (callback) => callback({}),
    findClientForUpdate: async () => ({
      id: 8, cuenta_id: null, identificacion: '1301000099', nombre_completo: 'Ana Lectora',
      telefono: '0991000099', correo: 'ana@example.com',
    }),
    hasPreviousLoanCode: async (_tx, clientId, code) => clientId === 8 && code === 'SOL-ANTERIOR',
    createAccount: async (_tx, input) => {
      createdClientAccount = input;
      return { id: 3, cliente_id: 8, estado: true, debe_cambiar_password: false, version_sesion: 1 };
    },
  };
  const service = createClientAuthService({ repository, jwtSecret: secret, jwtTtl: 3600 });
  const result = await service.activate({
    identificacion: '1301000099', contacto: 'ana@example.com', codigo: 'SOL-ANTERIOR',
    password: 'Segura#2026', confirmar_password: 'Segura#2026',
  });
  assert.equal(createdClientAccount.clientId, 8);
  assert.equal(result.user.cliente_id, 8);
});

test('el restablecimiento por personal obliga a cambiar contraseña y registra movimiento', async () => {
  const movements = [];
  const repository = {
    transaction: (callback) => callback({}),
    findClientByIdForUpdate: async () => ({ id: 8, cuenta_id: 3, identificacion: '1301000099', nombre_completo: 'Ana Lectora' }),
    resetClientPassword: async (_tx, accountId, passwordHash) => ({ id: accountId, cliente_id: 8, estado: true, debe_cambiar_password: true, version_sesion: 4, passwordHash }),
    addMovement: async (_tx, movement) => movements.push(movement),
  };
  const service = createClientAuthService({ repository, jwtSecret: secret, jwtTtl: 3600 });
  const result = await service.staffReset(8, { password: 'Temporal#2026' }, { id: 1, rol: 'bibliotecario', nombre_completo: 'María' });
  assert.equal(result.debe_cambiar_password, true);
  assert.equal(movements[0].tipo_actor, 'bibliotecario');
  assert.doesNotMatch(movements[0].detalle, /Temporal#2026/);
});
