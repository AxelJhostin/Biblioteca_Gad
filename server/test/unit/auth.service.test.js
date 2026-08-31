import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { createAuthService } from '../../src/modules/auth/auth.service.js';

test('autentica una cuenta activa y firma un token verificable', async () => {
  let marked = false;
  const repository = {
    findByLogin: async () => ({ id: 1, nombre_completo: 'Administradora', usuario: 'admin', rol: 'administrador', estado: true, password_hash: await bcrypt.hash('Segura#2026', 4) }),
    markLogin: async () => { marked = true; },
  };
  const service = createAuthService({ repository, jwtSecret: 'secreto-de-pruebas-suficientemente-largo', jwtTtl: 3600 });
  const result = await service.login({ usuario: 'admin', password: 'Segura#2026' });
  assert.equal(result.user.rol, 'administrador');
  assert.equal(service.verify(result.token).sub, '1');
  assert.equal(marked, true);
});

test('rechaza credenciales incorrectas sin revelar qué dato falló', async () => {
  const repository = {
    findByLogin: async () => null,
    markLogin: async () => {},
  };
  const service = createAuthService({ repository, jwtSecret: 'secreto-de-pruebas-suficientemente-largo', jwtTtl: 3600 });
  await assert.rejects(service.login({ usuario: 'nadie', password: 'incorrecta' }), (error) => error.code === 'INVALID_CREDENTIALS');
});

