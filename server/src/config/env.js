import 'dotenv/config';
import { z } from 'zod';

const booleanString = z.string().optional().transform((value) => String(value || '').toLowerCase() === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1).default('postgresql://postgres:postgres@127.0.0.1:5432/biblioteca_municipal'),
  DB_SSL: booleanString,
  DB_SSL_REJECT_UNAUTHORIZED: booleanString,
  DB_POOL_MAX: z.coerce.number().int().positive().max(50).default(10),
  JWT_SECRET: z.string().min(24).default('desarrollo-biblioteca-cambiar-antes-produccion'),
  JWT_TTL: z.coerce.number().int().positive().default(3600),
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_SECRET_KEY: z.string().optional().default(''),
  SUPABASE_COVERS_BUCKET: z.string().default('biblioteca-portadas'),
  SUPABASE_DIGITAL_BUCKET: z.string().default('biblioteca-digitales'),
  LOCAL_UPLOADS_DIR: z.string().default('./uploads'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Configuración inválida: ${parsed.error.message}`);
}

if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET.startsWith('desarrollo-')) {
  throw new Error('JWT_SECRET debe configurarse con un valor seguro en producción.');
}

export const env = parsed.data;

