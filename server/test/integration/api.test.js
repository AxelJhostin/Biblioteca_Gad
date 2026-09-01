import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { AppError } from '../../src/core/errors.js';

function dependencies() {
  const authenticate = (req, _res, next) => {
    if (req.headers.authorization === 'Bearer staff') {
      req.user = { id: 1, nombre_completo: 'Admin', rol: 'administrador' };
      return next();
    }
    next(new AppError('No autenticado', 401, 'UNAUTHENTICATED'));
  };
  return {
    db: { close: async () => {} },
    authService: { login: async () => ({ token: 'staff', user: { id: 1, rol: 'administrador' } }) },
    authenticate,
    storage: { download: async () => Buffer.from('file') },
    coversBucket: 'covers', digitalBucket: 'digital',
    catalogRepository: {
      list: async () => ({ items: [{ id: 1, titulo: 'Jipijapa en la memoria' }], pagination: { total: 1 } }),
      findByIdOrCode: async () => ({ id: 1, titulo: 'Jipijapa en la memoria' }),
      getCover: async () => null, getDigital: async () => null,
    },
    loansService: {
      createRequest: async () => ({ rejected: false, loan: { codigo: 'SOL-UNO', estado: 'pendiente' } }),
      getPublicStatus: async () => ({ codigo: 'SOL-UNO', estado: 'pendiente' }),
      list: async () => [], approveAndDeliver: async () => ({}), reject: async () => ({}), registerReturn: async () => ({}),
      createDirectLoan: async () => ({ id: 5, codigo: 'SOL-DIRECTO', estado: 'activo' }),
    },
    adminService: { listStaff: async () => [], createBook: async () => ({}), updateBook: async () => ({}), uploadCover: async () => ({}), uploadDigital: async () => ({}), createStaff: async () => ({}), updateStaff: async () => ({}), resetPassword: async () => ({}) },
    movementsRepository: { list: async () => [] },
    dashboardRepository: { get: async () => ({ metrics: {}, attention: [] }) },
  };
}

test('expone salud y catálogo público por HTTP', async () => {
  const app = createApp({ dependencies: dependencies() });
  const health = await request(app).get('/api/health').expect(200);
  assert.equal(health.body.ok, true);
  const catalog = await request(app).get('/api/catalogo').expect(200);
  assert.equal(catalog.body.items[0].titulo, 'Jipijapa en la memoria');
});

test('registra una solicitud pública y devuelve su código', async () => {
  const app = createApp({ dependencies: dependencies() });
  const response = await request(app).post('/api/solicitudes').send({}).expect(201);
  assert.equal(response.body.solicitud.codigo, 'SOL-UNO');
});

test('protege los módulos internos y permite una sesión válida', async () => {
  const app = createApp({ dependencies: dependencies() });
  await request(app).get('/api/prestamos').expect(401);
  const response = await request(app).get('/api/prestamos').set('Authorization', 'Bearer staff').expect(200);
  assert.deepEqual(response.body.items, []);
});

test('permite al personal registrar un préstamo directo', async () => {
  const app = createApp({ dependencies: dependencies() });
  const response = await request(app).post('/api/prestamos/directo').set('Authorization', 'Bearer staff').send({}).expect(201);
  assert.equal(response.body.item.estado, 'activo');
  assert.equal(response.body.item.codigo, 'SOL-DIRECTO');
});
