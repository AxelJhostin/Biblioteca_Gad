import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { NotFoundError } from '../../core/errors.js';

function safePathPart(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]/g, '-');
}

export function createStorageService(config) {
  const useSupabase = Boolean(config.supabaseUrl && config.supabaseSecretKey);
  const client = useSupabase
    ? createClient(config.supabaseUrl, config.supabaseSecretKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : null;

  return {
    async upload({ bucket, objectPath, buffer, contentType }) {
      const normalized = objectPath.split('/').map(safePathPart).join('/');
      if (client) {
        const { error } = await client.storage.from(bucket).upload(normalized, buffer, {
          contentType,
          upsert: false,
          cacheControl: '3600',
        });
        if (error) throw error;
      } else {
        const destination = path.resolve(config.localUploadsDir, bucket, normalized);
        await mkdir(path.dirname(destination), { recursive: true });
        await writeFile(destination, buffer);
      }
      return normalized;
    },
    async download({ bucket, objectPath }) {
      if (client) {
        const { data, error } = await client.storage.from(bucket).download(objectPath);
        if (error || !data) throw new NotFoundError('Archivo no disponible.');
        return Buffer.from(await data.arrayBuffer());
      }
      try {
        return await readFile(path.resolve(config.localUploadsDir, bucket, objectPath));
      } catch {
        throw new NotFoundError('Archivo no disponible.');
      }
    },
  };
}

