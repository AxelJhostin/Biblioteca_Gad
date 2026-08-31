import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../core/http.js';

export function createPublicLoanRoutes({ service }) {
  const router = Router();
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });

  router.post('/', limiter, asyncHandler(async (req, res) => {
    const result = await service.createRequest(req.body);
    res.status(result.rejected ? 409 : 201).json({
      ok: !result.rejected,
      code: result.rejected ? 'OUT_OF_STOCK' : undefined,
      message: result.rejected
        ? 'La solicitud fue rechazada automáticamente porque el material dejó de estar disponible.'
        : 'Solicitud registrada correctamente.',
      solicitud: { codigo: result.loan.codigo, estado: result.loan.estado },
    });
  }));

  router.get('/:codigo/consulta', asyncHandler(async (req, res) => {
    const item = await service.getPublicStatus(req.params.codigo, req.query.identificacion);
    res.json({ ok: true, item });
  }));
  return router;
}

export function createStaffLoanRoutes({ service, authenticate }) {
  const router = Router();
  router.use(authenticate);
  router.get('/', asyncHandler(async (req, res) => res.json({ ok: true, items: await service.list(req.query) })));
  router.post('/:id/aprobar-entregar', asyncHandler(async (req, res) => {
    const item = await service.approveAndDeliver(req.params.id, req.body.fecha_limite, req.user);
    res.json({ ok: true, message: 'Préstamo aprobado y entregado.', item });
  }));
  router.post('/:id/rechazar', asyncHandler(async (req, res) => {
    const item = await service.reject(req.params.id, req.body.motivo, req.user);
    res.json({ ok: true, message: 'Solicitud rechazada.', item });
  }));
  router.post('/:id/devoluciones', asyncHandler(async (req, res) => {
    const item = await service.registerReturn(req.params.id, req.body, req.user);
    res.json({ ok: true, message: 'Devolución registrada.', item });
  }));
  return router;
}

