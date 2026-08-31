import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'dotenv';

test('el entorno de ejemplo conserva las credenciales y puertos de Supabase local', async () => {
  const source = await readFile(new URL('../../.env.example', import.meta.url), 'utf8');
  const env = parse(source);

  assert.equal(env.DATABASE_URL, 'postgresql://postgres:postgres@127.0.0.1:55322/postgres');
  assert.equal(env.SUPABASE_URL, 'http://127.0.0.1:55321');
  assert.equal(env.ADMIN_USER, 'admin');
  assert.equal(env.ADMIN_PASSWORD, 'Admin#Cambiar2026');
});
