import { AppError } from '../../core/errors.js';

export function createAuthMiddleware(authService) {
  return async function authenticate(req, _res, next) {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : '';
      const payload = token && authService.verify(token);
      if (!payload || payload.type !== 'personal') throw new AppError('Sesión no válida o expirada.', 401, 'UNAUTHENTICATED');
      const user = await authService.getUser(payload.sub);
      if (!user || payload.role !== user.rol) throw new AppError('La cuenta está inactiva o ya no existe.', 401, 'ACCOUNT_INACTIVE');
      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRole(...roles) {
  return function roleMiddleware(req, _res, next) {
    if (!req.user || !roles.includes(req.user.rol)) {
      return next(new AppError('No tiene permisos para realizar esta acción.', 403, 'FORBIDDEN'));
    }
    next();
  };
}
