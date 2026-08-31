import { Router } from 'express';
import { asyncHandler } from '../../core/http.js';

export function createDashboardRoutes({ repository, authenticate }) {
  const router = Router();
  router.use(authenticate);
  router.get('/', asyncHandler(async (_req, res) => res.json({ ok: true, ...(await repository.get()) })));
  return router;
}

