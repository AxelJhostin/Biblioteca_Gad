import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { AppError } from '../../src/core/errors.js';

function dependencies() {
  const authenticate = (req, _res, next) => {
    if (req.headers.authorization === 'Bearer staff' || req.headers.authorization === 'Bearer librarian') {
      req.user = req.headers.authorization === 'Bearer librarian'
        ? { id: 2, nombre_completo: 'María', rol: 'bibliotecario' }
        : { id: 1, nombre_completo: 'Admin', rol: 'administrador' };
      return next();
    }
    next(new AppError('No autenticado', 401, 'UNAUTHENTICATED'));
  };
  const authenticateClient = (req, _res, next) => {
    if (req.headers.authorization === 'Bearer client') {
      req.client = { id: 2, cliente_id: 8, nombre_completo: 'Ana Lectora', rol: 'cliente' };
      req.clientAccount = { id: 2, cliente_id: 8, debe_cambiar_password: false };
      return next();
    }
    next(new AppError('No autenticado', 401, 'CLIENT_UNAUTHENTICATED'));
  };
  return {
    db: { close: async () => {} },
    authService: { login: async () => ({ token: 'staff', user: { id: 1, rol: 'administrador' } }) },
    authenticate,
    authenticateClient,
    clientAuthService: {
      register: async () => ({ token: 'client', user: { id: 2, cliente_id: 8, rol: 'cliente' } }),
      activate: async () => ({ token: 'client', user: { id: 2, cliente_id: 8, rol: 'cliente' } }),
      login: async () => ({ token: 'client', user: { id: 2, cliente_id: 8, rol: 'cliente' } }),
      changePassword: async () => ({ token: 'client-next', user: { id: 2, cliente_id: 8, rol: 'cliente' } }),
      getProfile: (account) => account,
      listLoans: async () => [{ id: 5, codigo: 'SOL-UNO' }],
      getLoan: async () => ({ id: 5, codigo: 'SOL-UNO' }),
      updateProfile: async () => ({}), listClients: async () => [], staffActivate: async () => ({}), staffReset: async () => ({}),
    },
    storage: { download: async () => Buffer.from('file') },
    coversBucket: 'covers', digitalBucket: 'digital',
    catalogRepository: {
      list: async () => ({ items: [{ id: 1, titulo: 'Jipijapa en la memoria' }], pagination: { total: 1 } }),
      findByIdOrCode: async () => ({ id: 1, titulo: 'Jipijapa en la memoria' }),
      getCover: async () => null, getDigital: async () => null,
    },
    loansService: {
      createClientRequest: async () => ({ rejected: false, loan: { codigo: 'SOL-UNO', estado: 'pendiente' } }),
      getClientStatus: async () => ({ codigo: 'SOL-UNO', estado: 'pendiente' }),
      list: async () => [{ id: 7, codigo: 'SOL-COMPARTIDA' }], review: async () => ({ estado: 'listo_retiro', resumen: { aprobados: 1, rechazados: 1 } }), deliver: async () => ({ estado: 'activo' }), registerReturn: async () => ({}),
      createDirectLoan: async () => ({ id: 5, codigo: 'SOL-DIRECTO', estado: 'activo' }),
    },
    adminService: { listStaff: async () => [], createBook: async () => ({}), updateBook: async () => ({}), uploadCover: async () => ({}), uploadDigital: async () => ({}), createStaff: async () => ({}), updateStaff: async () => ({}), resetPassword: async () => ({}) },
    movementsRepository: { list: async () => [] },
    dashboardRepository: { get: async () => ({ metrics: {}, attention: [] }) },
    reportsService: {
      generate: async ({ type, format }) => ({
        buffer: Buffer.from(format === 'pdf' ? '%PDF-reporte' : 'xlsx-reporte'),
        contentType: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename: `biblioteca-jipijapa-${type}-2026-08-31.${format}`,
        count: 2,
      }),
    },
  };
}

test('expone salud y catálogo público por HTTP', async () => {
  const app = createApp({ dependencies: dependencies() });
  const health = await request(app).get('/api/health').expect(200);
  assert.equal(health.body.ok, true);
  const catalog = await request(app).get('/api/catalogo').expect(200);
  assert.equal(catalog.body.items[0].titulo, 'Jipijapa en la memoria');
});

test('exige cuenta cliente y registra una solicitud autenticada', async () => {
  const app = createApp({ dependencies: dependencies() });
  await request(app).post('/api/solicitudes').send({}).expect(401);
  const response = await request(app).post('/api/solicitudes').set('Authorization', 'Bearer client').send({}).expect(201);
  assert.equal(response.body.solicitud.codigo, 'SOL-UNO');
});

test('protege y entrega únicamente la actividad de la cuenta cliente', async () => {
  const app = createApp({ dependencies: dependencies() });
  await request(app).get('/api/clientes/me/prestamos').expect(401);
  const response = await request(app).get('/api/clientes/me/prestamos').set('Authorization', 'Bearer client').expect(200);
  assert.equal(response.body.items[0].codigo, 'SOL-UNO');
});

test('bibliotecario y administrador consultan el mismo historial completo de préstamos', async () => {
  const app = createApp({ dependencies: dependencies() });
  await request(app).get('/api/prestamos').expect(401);
  const admin = await request(app).get('/api/prestamos').set('Authorization', 'Bearer staff').expect(200);
  const librarian = await request(app).get('/api/prestamos').set('Authorization', 'Bearer librarian').expect(200);
  assert.deepEqual(admin.body.items, [{ id: 7, codigo: 'SOL-COMPARTIDA' }]);
  assert.deepEqual(librarian.body.items, admin.body.items);
});

test('permite al personal registrar un préstamo directo', async () => {
  const app = createApp({ dependencies: dependencies() });
  const response = await request(app).post('/api/prestamos/directo').set('Authorization', 'Bearer staff').send({}).expect(201);
  assert.equal(response.body.item.estado, 'activo');
  assert.equal(response.body.item.codigo, 'SOL-DIRECTO');
});

test('permite revisión mixta por HTTP antes de la entrega física', async () => {
  const app = createApp({ dependencies: dependencies() });
  const approval = await request(app).post('/api/prestamos/5/revisar').set('Authorization', 'Bearer staff').send({
    items: [{ detalle_id: 1, cantidad_aprobada: 1 }, { detalle_id: 2, cantidad_aprobada: 0 }],
  }).expect(200);
  assert.equal(approval.body.item.estado, 'listo_retiro');
  assert.equal(approval.body.item.resumen.rechazados, 1);
  const delivery = await request(app).post('/api/prestamos/5/entregar').set('Authorization', 'Bearer staff').send({ fecha_limite: '2099-12-31' }).expect(200);
  assert.equal(delivery.body.item.estado, 'activo');
});

test('protege y entrega reportes institucionales como archivos adjuntos', async () => {
  const app = createApp({ dependencies: dependencies() });
  await request(app).get('/api/reportes/prestamos/pdf').expect(401);
  const response = await request(app)
    .get('/api/reportes/prestamos/pdf')
    .set('Authorization', 'Bearer staff')
    .expect(200)
    .expect('Content-Type', 'application/pdf')
    .expect('X-Report-Records', '2');
  assert.match(response.headers['content-disposition'], /biblioteca-jipijapa-prestamos-2026-08-31\.pdf/);
});
