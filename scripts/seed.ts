import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import seed from '../data/seed.json';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql = neon(process.env.DATABASE_URL);
async function main() {
  const schema = readFileSync('db/schema.sql', 'utf8');
  for (const statement of (schema.match(/CREATE OR REPLACE FUNCTION[\s\S]*?\$\$;|CREATE TABLE[\s\S]*?;/g) ?? [])) await sql.query(statement);
  const initialized = await sql`SELECT 1 FROM audit_log WHERE action = 'seed' LIMIT 1`;
  const loadTemplate = !initialized.length || process.argv.includes('--reset-template');
  await sql.transaction([
    ...seed.teachers.map(name => sql`INSERT INTO teachers (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`),
    ...(process.argv.includes('--reset-template') ? [sql`DELETE FROM template_cells`] : []),
    ...(loadTemplate ? seed.template : []).map(c => sql`INSERT INTO template_cells (day, room, slot, name) VALUES (${c.day}, ${c.room}, ${c.slot}, ${c.name}) ON CONFLICT (day,room,slot) DO NOTHING`),
    sql`INSERT INTO weeks (start_date) VALUES ('2026-11-02'), ('2026-11-09') ON CONFLICT (start_date) DO NOTHING`,
    sql`INSERT INTO audit_log (actor, role, action, details) VALUES ('Seed script', 'admin', 'seed', ${JSON.stringify({resetTemplate: process.argv.includes('--reset-template')})}::jsonb)`
  ]);
  console.log('Database seeded.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
