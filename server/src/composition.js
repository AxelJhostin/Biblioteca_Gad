import { env } from './config/env.js';
import { createDatabase } from './db/index.js';
import { createAuthRepository } from './modules/auth/auth.repository.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createAuthMiddleware } from './modules/auth/auth.middleware.js';
import { createStorageService } from './modules/storage/storage.service.js';
import { createCatalogRepository } from './modules/catalog/catalog.repository.js';
import { createLoansRepository } from './modules/loans/loans.repository.js';
import { createLoansService } from './modules/loans/loans.service.js';
import { createAdminRepository } from './modules/admin/admin.repository.js';
import { createAdminService } from './modules/admin/admin.service.js';
import { createMovementsRepository } from './modules/movements/movements.repository.js';
import { createDashboardRepository } from './modules/dashboard/dashboard.repository.js';

export function createDependencies(overrides = {}) {
  const db = overrides.db || createDatabase();
  const authRepository = overrides.authRepository || createAuthRepository(db);
  const authService = overrides.authService || createAuthService({
    repository: authRepository, jwtSecret: env.JWT_SECRET, jwtTtl: env.JWT_TTL,
  });
  const storage = overrides.storage || createStorageService({
    supabaseUrl: env.SUPABASE_URL,
    supabaseSecretKey: env.SUPABASE_SECRET_KEY,
    localUploadsDir: env.LOCAL_UPLOADS_DIR,
  });
  const loansRepository = overrides.loansRepository || createLoansRepository(db);
  const adminRepository = overrides.adminRepository || createAdminRepository(db);

  return {
    db,
    authService,
    authenticate: overrides.authenticate || createAuthMiddleware(authService),
    storage,
    catalogRepository: overrides.catalogRepository || createCatalogRepository(db),
    loansService: overrides.loansService || createLoansService(loansRepository),
    adminService: overrides.adminService || createAdminService({
      repository: adminRepository,
      storage,
      coversBucket: env.SUPABASE_COVERS_BUCKET,
      digitalBucket: env.SUPABASE_DIGITAL_BUCKET,
    }),
    movementsRepository: overrides.movementsRepository || createMovementsRepository(db),
    dashboardRepository: overrides.dashboardRepository || createDashboardRepository(db),
    coversBucket: env.SUPABASE_COVERS_BUCKET,
    digitalBucket: env.SUPABASE_DIGITAL_BUCKET,
  };
}

