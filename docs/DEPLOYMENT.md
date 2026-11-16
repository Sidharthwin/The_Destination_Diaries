# Deployment

Target: **Vercel** (application) + **Supabase** (PostgreSQL with PostGIS, Auth).

## 1. Supabase

1. Create a project. In **Database → Extensions**, enable `postgis` (and `pg_trgm`).
2. **Settings → Database**: copy the *transaction pooler* string (port 6543) for `DATABASE_URL` and the *session/direct* string (port 5432) for `DIRECT_URL`.
3. **Authentication → URL configuration**: set the Site URL to your production URL and add `https://YOUR-DOMAIN/auth/callback` to Redirect URLs.
4. **Authentication → Providers**: keep email confirmation on; enable Google if wanted (see ENVIRONMENT_SETUP.md §4).

## 2. Database

From your machine, pointing at production:

```bash
DIRECT_URL="postgresql://…:5432/postgres" npm run db:migrate
DIRECT_URL="postgresql://…:5432/postgres" DATABASE_URL="postgresql://…:5432/postgres" npm run db:seed   # optional sample data
```

Migrations create the schema, PostGIS columns and indexes, and Row Level Security policies.

## 3. Vercel

1. Import the repository; the framework is detected automatically. `postinstall` runs `prisma generate`.
2. Add environment variables (Production and Preview):

   | Variable | Required |
   |---|---|
   | `DATABASE_URL` (pooler, 6543) | yes |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes |
   | `NEXT_PUBLIC_SITE_URL` | yes — your canonical URL |
   | `NEXT_PUBLIC_MAPBOX_TOKEN` | for interactive maps |
   | `MAPBOX_SECRET_TOKEN` | optional — measured travel times |
   | `ANTHROPIC_API_KEY`, `LLM_MODEL` | optional — AI wording |
   | `ADMIN_EMAILS` | comma-separated emails promoted to admin on sign-in |

   Do **not** set `DEV_AUTH` in production. It is ignored there, but leave it out.
3. Deploy.

## 4. After the first deploy — verify by hand

These paths depend on your own accounts and could not be exercised in development:

- [ ] Sign up with email → receive the confirmation email → land signed in on the dashboard.
- [ ] Sign in with Google → returned to the page you started from.
- [ ] Forgot password → email link → set a new password.
- [ ] A signed-in user with an email in `ADMIN_EMAILS` can open `/admin`.
- [ ] The map on a trip shows Mapbox tiles (not the schematic fallback).
- [ ] With `MAPBOX_SECRET_TOKEN` set, route legs in a new itinerary say "measured route".
- [ ] With an AI key set, a new itinerary shows AI-written day titles and `/admin/providers` shows the `explain` stage succeeding.
- [ ] `/admin/ingestion` → run an OpenStreetMap import for one city and review the new unverified places.

## 5. Operations

- **Generation time.** `generate` and `replan` allow up to 60 seconds (`maxDuration`). Without external providers they take well under a second.
- **Monitoring.** `/admin/providers` shows provider calls, error rates and per-stage generation outcomes; `/admin/ingestion` shows import jobs and lets you retry failures.
- **Backups.** Use Supabase's scheduled backups; itinerary history lives entirely in the database.
