import { ZodError } from 'zod';
import { AppError } from './errors.js';

export const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export function notFoundHandler(req, res) {
  res.status(404).json({ ok: false, code: 'ROUTE_NOT_FOUND', message: `No existe ${req.method} ${req.path}.` });
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(422).json({
      ok: false,
      code: 'VALIDATION_ERROR',
      message: 'Revise los datos enviados.',
      errors: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
  }
  if (error instanceof AppError) {
    return res.status(error.status).json({ ok: false, code: error.code, message: error.message, details: error.details });
  }
  if (error?.code === '23505') {
    return res.status(409).json({ ok: false, code: 'DUPLICATE', message: 'Ya existe un registro con ese identificador.' });
  }
  console.error(error);
  return res.status(500).json({ ok: false, code: 'INTERNAL_ERROR', message: 'Error interno del servidor.' });
}

