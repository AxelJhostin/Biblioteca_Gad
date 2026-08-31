import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { createDependencies } from './composition.js';
import { errorHandler, notFoundHandler } from './core/http.js';
import { createAuthRoutes } from './modules/auth/auth.routes.js';
import { createCatalogRoutes } from './modules/catalog/catalog.routes.js';
import { createPublicLoanRoutes, createStaffLoanRoutes } from './modules/loans/loans.routes.js';
import { createAdminRoutes } from './modules/admin/admin.routes.js';
import { createMovementsRoutes } from './modules/movements/movements.routes.js';
import { createDashboardRoutes } from './modules/dashboard/dashboard.routes.js';

export function createApp(overrides = {}) {
  const dependencies = overrides.dependencies || createDependencies(overrides);
  const app = express();
  const allowedOrigins = env.CLIENT_URL.split(',').map((origin) => origin.trim()).filter(Boolean);

  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: env.NODE_ENV === 'test' ? true : allowedOrigins, credentials: false }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({
    ok: true,
    service: 'biblioteca-municipal-api',
    storage: env.SUPABASE_URL && env.SUPABASE_SECRET_KEY ? 'supabase' : 'local',
    timestamp: new Date().toISOString(),
  }));

  app.use('/api/auth', createAuthRoutes(dependencies));
  app.use('/api/catalogo', createCatalogRoutes({
    repository: dependencies.catalogRepository,
    storage: dependencies.storage,
    coversBucket: dependencies.coversBucket,
    digitalBucket: dependencies.digitalBucket,
  }));
  app.use('/api/solicitudes', createPublicLoanRoutes({ service: dependencies.loansService }));
  app.use('/api/prestamos', createStaffLoanRoutes({ service: dependencies.loansService, authenticate: dependencies.authenticate }));
  app.use('/api/admin', createAdminRoutes({ service: dependencies.adminService, authenticate: dependencies.authenticate }));
  app.use('/api/movimientos', createMovementsRoutes({
    repository: dependencies.movementsRepository,
    authenticate: dependencies.authenticate,
  }));
  app.use('/api/dashboard', createDashboardRoutes({
    repository: dependencies.dashboardRepository,
    authenticate: dependencies.authenticate,
  }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  app.locals.dependencies = dependencies;
  return app;
}

