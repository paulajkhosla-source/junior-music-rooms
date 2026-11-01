# Junior Music Teaching Rooms

A shared weekly booking sheet for the junior music department. The regular rota supplies each week unless a cell has a week-specific change.

Set `DATABASE_URL`, `STAFF_CODE`, `ADMIN_CODE` and a long random `SESSION_SECRET` in `.env.local` (see `.env.example`). Use HTTPS for the secure session cookie. Create the database tables and initial weeks with `npx tsx scripts/seed.ts` (export `DATABASE_URL` in the shell first). Re-run with `--reset-template` to reload the regular rota from the seed file; existing weekly overrides remain. Run `npm run dev` to start the app.
