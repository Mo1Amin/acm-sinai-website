// Applies SQL files in migrations/ that have not been applied yet.
// Usage: npm run migrate            (schema + initial content)
//        npm run migrate -- --no-seed
process.env.TZ = 'Africa/Cairo';
const fs = require('fs');
const path = require('path');
const db = require('../db');
const config = require('../config');

function splitSql(sql) {
  return sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter(Boolean);
}

(async () => {
  const noSeed = process.argv.includes('--no-seed');
  const dir = path.join(config.root, 'migrations');
  await db.run('CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(40) PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
  const done = new Set((await db.all('SELECT version FROM schema_migrations')).map((r) => r.version));
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (done.has(version)) continue;
    if (noSeed && /seed/i.test(file)) continue;
    const statements = splitSql(fs.readFileSync(path.join(dir, file), 'utf8'));
    const conn = await db.pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const st of statements) await conn.query(st);
      await conn.query('INSERT INTO schema_migrations (version) VALUES (?)', [version]);
      await conn.commit();
      console.log(`applied ${file} (${statements.length} statements)`);
    } catch (e) {
      await conn.rollback();
      console.error(`failed ${file}: ${e.message}`);
      process.exitCode = 1;
      break;
    } finally {
      conn.release();
    }
  }
  await db.pool.end();
})();
