import { Router } from 'express';
import { asyncHandler } from '../../core/http.js';

export function createReportsRoutes({ service, authenticate }) {
  const router = Router();
  router.use(authenticate);
  router.get('/:type/:format', asyncHandler(async (req, res) => {
    const report = await service.generate({
      type: req.params.type,
      format: req.params.format,
      filters: req.query,
      actor: req.user,
    });
    res.set({
      'Content-Type': report.contentType,
      'Content-Length': report.buffer.length,
      'Content-Disposition': `attachment; filename="${report.filename}"`,
      'Cache-Control': 'private, no-store',
      'X-Report-Records': String(report.count),
    }).send(report.buffer);
  }));
  return router;
}
