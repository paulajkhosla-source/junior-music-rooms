import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { splitSql } from './sql';
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  if (!process.env.CONFIRM_DB_HOST || process.env.CONFIRM_DB_HOST !== new URL(url).hostname) throw new Error('CONFIRM_DB_HOST must match DATABASE_URL hostname');
  const file = process.argv[2]; if (!file) throw new Error('Migration file is required');
  const statements = splitSql(readFileSync(file, 'utf8')).filter(s => !/^(BEGIN|COMMIT)$/i.test(s));
  const sql = neon(url); await sql.transaction(statements.map(statement => sql.query(statement)));
  console.log(`Applied ${file} (${statements.length} statements).`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
