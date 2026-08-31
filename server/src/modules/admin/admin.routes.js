import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../../core/http.js';
import { requireRole } from '../auth/auth.middleware.js';

export function createAdminRoutes({ service, authenticate }) {
  const router = Router();
  const upload = multer({ storage: multer.memoryStorage() });
  router.use(authenticate, requireRole('administrador'));

  router.post('/libros', asyncHandler(async (req, res) => {
    const item = await service.createBook(req.body, req.user);
    res.status(201).json({ ok: true, message: 'Libro registrado.', item });
  }));
  router.patch('/libros/:id', asyncHandler(async (req, res) => {
    const item = await service.updateBook(req.params.id, req.body, req.user);
    res.json({ ok: true, message: 'Libro actualizado.', item });
  }));
  router.post('/libros/:id/portada', upload.single('portada'), asyncHandler(async (req, res) => {
    const item = await service.uploadCover(req.params.id, req.file, req.user);
    res.json({ ok: true, message: 'Portada actualizada.', item });
  }));
  router.post('/libros/:id/digital', upload.single('archivo'), asyncHandler(async (req, res) => {
    const item = await service.uploadDigital(req.params.id, req.file, req.user);
    res.json({ ok: true, message: 'Archivo digital actualizado.', item });
  }));
  router.get('/personal', asyncHandler(async (_req, res) => res.json({ ok: true, items: await service.listStaff() })));
  router.post('/personal', asyncHandler(async (req, res) => {
    const item = await service.createStaff(req.body);
    res.status(201).json({ ok: true, message: 'Cuenta creada.', item });
  }));
  router.patch('/personal/:id', asyncHandler(async (req, res) => {
    const item = await service.updateStaff(req.params.id, req.body);
    res.json({ ok: true, message: 'Cuenta actualizada.', item });
  }));
  router.post('/personal/:id/restablecer-password', asyncHandler(async (req, res) => {
    const item = await service.resetPassword(req.params.id, req.body.password);
    res.json({ ok: true, message: 'Contraseña restablecida.', item });
  }));
  return router;
}

