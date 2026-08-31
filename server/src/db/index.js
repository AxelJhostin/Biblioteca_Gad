import pg from 'pg';
import { env } from '../config/env.js';

export function createDatabase(config = {}) {
  const pool = config.pool || new pg.Pool({
    connectionString: config.connectionString || env.DATABASE_URL,
    max: env.DB_POOL_MAX,
    ssl: env.DB_SSL ? { rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED } : undefined,
  });

  return {
    query(text, params = []) {
      return pool.query(text, params);
    },
    async transaction(callback) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await callback({ query: (text, params = []) => client.query(text, params) });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    close() {
      return pool.end();
    },
  };
}

