import { Router } from 'express';
import { asyncHandler } from '../../core/http.js';
import { NotFoundError } from '../../core/errors.js';

export function createCatalogRoutes({ repository, storage, coversBucket, digitalBucket }) {
  const router = Router();

  router.get('/', asyncHandler(async (req, res) => {
    const result = await repository.list(req.query);
    res.json({ ok: true, ...result });
  }));

  router.get('/:value', asyncHandler(async (req, res) => {
    const item = await repository.findByIdOrCode(req.params.value);
    if (!item) throw new NotFoundError('Libro no encontrado.');
    res.json({ ok: true, item });
  }));

  router.get('/:id/portada', asyncHandler(async (req, res) => {
    const cover = await repository.getCover(req.params.id);
    if (!cover?.portada_path) throw new NotFoundError('Portada no disponible.');
    const data = await storage.download({ bucket: coversBucket, objectPath: cover.portada_path });
    res.set({ 'Content-Type': cover.portada_mime || 'image/jpeg', 'Cache-Control': 'public, max-age=3600' }).send(data);
  }));

  router.get('/:id/visor', asyncHandler(async (req, res) => {
    const file = await repository.getDigital(req.params.id);
    if (!file) throw new NotFoundError('Versión digital no disponible.');
    const data = await storage.download({ bucket: digitalBucket, objectPath: file.storage_path });
    res.set({
      'Content-Type': file.mime_type || 'application/pdf',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.nombre_original)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    }).send(data);
  }));

  return router;
}

