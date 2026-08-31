import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from '../db/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(here, '../../../supabase/migrations');
const db = createDatabase();

try {
  await db.query(`
    create table if not exists public.app_schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `);
  const files = (await readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
  for (const file of files) {
    const exists = await db.query('select 1 from public.app_schema_migrations where version = $1', [file]);
    if (exists.rowCount) continue;
    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    await db.query(sql);
    await db.query('insert into public.app_schema_migrations (version) values ($1)', [file]);
    console.log(`Aplicada: ${file}`);
  }
  console.log('Migraciones al día.');
} finally {
  await db.close();
}

