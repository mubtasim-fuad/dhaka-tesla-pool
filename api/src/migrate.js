import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool, transaction } from './db.js';

const sqlDir = join(dirname(fileURLToPath(import.meta.url)), '../sql');
try {
  await transaction(async (db) => {
    await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
    for (const name of (await readdir(sqlDir)).filter((file) => file.endsWith('.sql')).sort()) {
      const applied = await db.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
      if (applied.rowCount) continue;
      await db.query(await readFile(join(sqlDir, name), 'utf8'));
      await db.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
      console.log(`Applied ${name}`);
    }
  });
} finally {
  await pool.end();
}
