# Row Level Security

The RLS policies live in the Prisma migration [`prisma/migrations/0003_rls/migration.sql`](../../prisma/migrations/0003_rls/migration.sql) so that `prisma migrate deploy` applies schema, PostGIS and security together.

Summary:

- **User-owned data** (`profiles`, `user_preferences`, `saved_places`, `trips` and every trip child table): only the owner — or a collaborator, for trips — can read; only the owner or an `EDITOR` collaborator can write.
- **Shared trips** are never listable. `get_shared_trip(slug)` returns a trip only for an exact, enabled share slug.
- **Reference data** (states, cities, places, …): public read, admin write.
- **Operations tables** (ingestion jobs, provider logs, generation logs): admin only. Anyone signed in may file a place report; anyone may send feedback.

The application connects through Prisma with a privileged role and enforces the same rules in its service layer (`loadTripForUser`, `requireAdmin`). RLS is the second line of defence for anything that reaches the database through Supabase's own API. It is exercised by `tests/integration/api.test.ts` → "row level security".
