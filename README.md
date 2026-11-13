# Junior Music Teaching Rooms

A shared weekly booking sheet for the junior music department. The regular rota supplies each week unless a cell has a week-specific change.

Set `DATABASE_URL`, `STAFF_CODE`, `ADMIN_CODE` and a long random `SESSION_SECRET` in `.env.local` (see `.env.example`). Use HTTPS for the secure session cookie. Create the database tables and initial weeks with `npx tsx scripts/seed.ts` (export `DATABASE_URL` in the shell first). Re-run with `--reset-template` to reload the regular rota from the seed file; existing weekly overrides remain. Run `npm run dev` to start the app.

Apply `db/migrations/001_archive_and_swaps.sql` to production only after approval and **before deploying** the new app. Set `DATABASE_URL` to the approved production database and `CONFIRM_DB_HOST` to its hostname, then run `npx tsx scripts/migrate.ts db/migrations/001_archive_and_swaps.sql`. The hostname must match as a safety check. The migration is transactional and can be run again safely. Test it on a database branch first. Fresh installations receive the same schema through the seed script.
