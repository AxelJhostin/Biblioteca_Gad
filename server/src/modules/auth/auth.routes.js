import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../core/http.js';

export function createAuthRoutes({ authService, authenticate }) {
  const router = Router();
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { ok: false, code: 'TOO_MANY_LOGIN_ATTEMPTS', message: 'Demasiados intentos. Espere 15 minutos antes de volver a intentar.' },
  });

  router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
    const result = await authService.login(req.body);
    res.json({ ok: true, ...result });
  }));

  router.get('/me', authenticate, (req, res) => {
    res.json({ ok: true, user: req.user });
  });

  return router;
}
