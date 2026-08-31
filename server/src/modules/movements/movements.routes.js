import { Router } from 'express';
import { asyncHandler } from '../../core/http.js';
import { requireRole } from '../auth/auth.middleware.js';

export function createMovementsRoutes({ repository, authenticate }) {
  const router = Router();
  router.use(authenticate, requireRole('administrador'));
  router.get('/', asyncHandler(async (req, res) => res.json({ ok: true, items: await repository.list(req.query) })));
  return router;
}

