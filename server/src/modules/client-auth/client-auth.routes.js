import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../core/http.js';
import { requireRole } from '../auth/auth.middleware.js';
import { requireChangedPassword } from './client-auth.middleware.js';

export function createClientRoutes({ service, loansService, authenticateClient, authenticate }) {
  const router = Router();
  const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false });

  router.post('/auth/registro', publicLimiter, asyncHandler(async (req, res) => {
    const result = await service.register(req.body);
    res.status(201).json({ ok: true, message: 'Cuenta creada correctamente.', ...result });
  }));
  router.post('/auth/activar', publicLimiter, asyncHandler(async (req, res) => {
    const result = await service.activate(req.body);
    res.status(201).json({ ok: true, message: 'Cuenta activada correctamente.', ...result });
  }));
  router.post('/auth/login', loginLimiter, asyncHandler(async (req, res) => {
    const result = await service.login(req.body);
    res.json({ ok: true, ...result });
  }));
  router.get('/auth/me', authenticateClient, (req, res) => res.json({ ok: true, user: req.client }));
  router.post('/auth/cambiar-password', authenticateClient, asyncHandler(async (req, res) => {
    const result = await service.changePassword(req.clientAccount, req.body);
    res.json({ ok: true, message: 'Contraseña actualizada.', ...result });
  }));

  router.get('/me', authenticateClient, requireChangedPassword, (req, res) => res.json({ ok: true, item: req.client }));
  router.patch('/me', authenticateClient, requireChangedPassword, asyncHandler(async (req, res) => {
    const item = await service.updateProfile(req.clientAccount, req.body);
    res.json({ ok: true, message: 'Perfil actualizado.', item });
  }));
  router.get('/me/prestamos', authenticateClient, requireChangedPassword, asyncHandler(async (req, res) => {
    res.json({ ok: true, items: await service.listLoans(req.clientAccount) });
  }));
  router.get('/me/prestamos/:id', authenticateClient, requireChangedPassword, asyncHandler(async (req, res) => {
    res.json({ ok: true, item: await service.getLoan(req.clientAccount, req.params.id) });
  }));
  router.post('/me/solicitudes', authenticateClient, requireChangedPassword, asyncHandler(async (req, res) => {
    const result = await loansService.createClientRequest(req.body, req.client);
    res.status(result.rejected ? 409 : 201).json({
      ok: !result.rejected,
      code: result.rejected ? 'OUT_OF_STOCK' : undefined,
      message: result.rejected
        ? 'La solicitud fue rechazada automáticamente porque el material dejó de estar disponible.'
        : 'Solicitud registrada correctamente.',
      solicitud: { codigo: result.loan.codigo, estado: result.loan.estado },
    });
  }));

  router.use(authenticate, requireRole('bibliotecario', 'administrador'));
  router.get('/', asyncHandler(async (req, res) => res.json({ ok: true, items: await service.listClients(req.query) })));
  router.post('/:id/activar-cuenta', asyncHandler(async (req, res) => {
    const item = await service.staffActivate(req.params.id, req.body, req.user);
    res.status(201).json({ ok: true, message: 'Cuenta activada con contraseña temporal.', item });
  }));
  router.post('/:id/restablecer-password', asyncHandler(async (req, res) => {
    const item = await service.staffReset(req.params.id, req.body, req.user);
    res.json({ ok: true, message: 'Contraseña temporal establecida.', item });
  }));
  router.patch('/:id/estado-cuenta', asyncHandler(async (req, res) => {
    const item = await service.staffSetStatus(req.params.id, req.body, req.user);
    res.json({
      ok: true,
      message: item.estado ? 'Cuenta de cliente reactivada.' : 'Cuenta de cliente inactivada.',
      item,
    });
  }));

  return router;
}
