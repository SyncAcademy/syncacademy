const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { Pool } = require('pg');

const prismaRoot = path.resolve(__dirname, '../prisma');
const cli = require.resolve('prisma/build/index.js');
const prerequisite = '202610230002_parent_mobile';
const firstDependent = '202610230001_parent_announcement_media';

function deploy(schema) {
  const result = spawnSync(process.execPath, [cli, 'migrate', 'deploy', '--schema', schema], {
    env: process.env, stdio: 'inherit', windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`Migration deployment exited with status ${result.status}`);
}

async function main() {
  require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
  if (!process.env.DATABASE_URL) throw Error('DATABASE_URL is required for migrations.');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  let needsPrerequisite;
  try {
    const history = await pool.query("SELECT to_regclass('public._prisma_migrations') AS history");
    const applied = history.rows[0].history
      ? await pool.query('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')
      : { rows: [] };
    needsPrerequisite = !applied.rows.some(row => row.migration_name === prerequisite);
  } finally { await pool.end(); }

  if (needsPrerequisite) {
    // The historical media migration sorts before its parent-table prerequisite.
    // Apply the unchanged prerequisite history first through Prisma itself.
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'syncacademy-migrations-'));
    try {
      fs.copyFileSync(path.join(prismaRoot, 'schema.prisma'), path.join(temporary, 'schema.prisma'));
      const migrations = path.join(temporary, 'migrations');
      fs.mkdirSync(migrations);
      for (const name of fs.readdirSync(path.join(prismaRoot, 'migrations'))) {
        if (name !== 'migration_lock.toml' && name >= firstDependent && name !== prerequisite) continue;
        fs.cpSync(path.join(prismaRoot, 'migrations', name), path.join(migrations, name), { recursive: true });
      }
      deploy(path.join(temporary, 'schema.prisma'));
    } finally {
      if (path.dirname(temporary) !== path.resolve(os.tmpdir())) throw Error('Unexpected migration temporary directory');
      fs.rmSync(temporary, { recursive: true, force: true });
    }
  }
  deploy(path.join(prismaRoot, 'schema.prisma'));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
