import { Router } from 'express';
import { asyncHandler } from '../../core/http.js';

export function createAuthRoutes({ authService, authenticate }) {
  const router = Router();

  router.post('/login', asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.json({ ok: true, ...result });
  }));

  router.get('/me', authenticate, (req, res) => {
    res.json({ ok: true, user: req.user });
  });

  return router;
}

