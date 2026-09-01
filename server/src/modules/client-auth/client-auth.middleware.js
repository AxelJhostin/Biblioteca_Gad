import { AppError } from '../../core/errors.js';

export function createClientAuthMiddleware(service) {
  return async function authenticateClient(req, _res, next) {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : '';
      const payload = token && service.verify(token);
      const account = payload && await service.getSessionAccount(payload);
      if (!account) throw new AppError('Sesión de cliente no válida o expirada.', 401, 'CLIENT_UNAUTHENTICATED');
      req.clientAccount = account;
      req.client = service.getProfile(account);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireChangedPassword(req, _res, next) {
  if (req.clientAccount?.debe_cambiar_password) {
    return next(new AppError('Debes cambiar la contraseña temporal para continuar.', 403, 'PASSWORD_CHANGE_REQUIRED'));
  }
  next();
}
