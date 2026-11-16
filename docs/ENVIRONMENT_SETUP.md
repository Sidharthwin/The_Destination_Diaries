# Destination Diaries — Environment Setup

## 1. Prerequisites

- Node.js ≥ 20 (22+ recommended — Supabase is dropping Node 20 support), npm ≥ 10
- Docker, if you want a local database (see the README quick start)
- A Supabase project (free tier works): https://supabase.com/dashboard
- A Mapbox account for map rendering: https://account.mapbox.com
- (Optional) An Anthropic API key for AI personalization/explanations
- (Optional) Google Cloud project for Google OAuth

## 2. Environment variables

Copy `.env.example` → `.env.local` (Next.js) and `.env` (Prisma CLI reads `.env`). Never commit either.

| Variable | Public? | Required | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | ✅ | Supabase project URL (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | ✅ | Supabase anon key — safe to expose; RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | **no** | server tasks (seed, admin ops) | Bypasses RLS. Server-side only, never shipped to client |
| `DATABASE_URL` | **no** | ✅ | Postgres pooled connection string (Supabase → Settings → Database → "Transaction" pooler, port 6543, add `?pgbouncer=true`) |
| `DIRECT_URL` | **no** | ✅ (migrations) | Direct connection (port 5432) used by `prisma migrate` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | yes | ✅ for maps | Mapbox public token (`pk.…`), URL-restricted in Mapbox dashboard |
| `MAPBOX_SECRET_TOKEN` | **no** | optional | Server-side Directions API. Unset → heuristic routing (labelled) |
| `ANTHROPIC_API_KEY` | **no** | optional | LLM personalization/explanations. Unset → deterministic fallbacks |
| `LLM_PROVIDER` | no | optional | `anthropic` (default) — adapter selector |
| `LLM_MODEL` | no | optional | default `claude-opus-5-5` |
| `NEXT_PUBLIC_SITE_URL` | yes | ✅ in prod | Canonical URL for auth redirects, e.g. `https://yourdomain.com` |
| `ADMIN_EMAILS` | **no** | optional | Comma-separated emails promoted to admin when they sign in |
| `DEV_AUTH` | **no** | local only | `1` enables test sign-in identities. Ignored when `NODE_ENV=production` |
| `OVERPASS_URL` | no | optional | Alternative Overpass endpoint for OpenStreetMap imports |

The app **boots and builds with only the Supabase + database variables**; optional providers degrade gracefully with labelled heuristics.

## 3. Supabase setup

1. Create a project; note URL + keys.
2. **Enable PostGIS**: Dashboard → Database → Extensions → enable `postgis` (schema `extensions`). Our migrations assume this.
3. Database passwords: use the connection strings from Settings → Database for `DATABASE_URL` (pooler) and `DIRECT_URL` (direct).
4. Run migrations + seed:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```
5. Auth → URL Configuration: set Site URL to `http://localhost:3000` (dev) and add `http://localhost:3000/auth/callback` to Redirect URLs. Repeat with your production domain later.
6. Auth → Providers → Email: keep "Confirm email" ON (the app expects verification).

## 4. Google OAuth (manual configuration)

1. Google Cloud Console → APIs & Services → OAuth consent screen: External, app name "Destination Diaries", add your email; publish.
2. Credentials → Create credentials → OAuth client ID → Web application:
   - Authorized JavaScript origins: `http://localhost:3000`, your prod URL, and `https://<project-ref>.supabase.co`
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Copy Client ID + Secret into Supabase → Auth → Providers → Google, enable it.
4. No app-side env var is needed; Supabase brokers the flow. The app's "Continue with Google" button redirects via `supabase.auth.signInWithOAuth` to `/auth/callback`.

## 5. Mapbox

1. Create a public token (`pk.…`); restrict to your URLs in the Mapbox dashboard → `NEXT_PUBLIC_MAPBOX_TOKEN`.
2. (Optional) Create a secret token with Directions scope → `MAPBOX_SECRET_TOKEN`. Directions coverage for Indian driving routes is generally good but the app labels every leg with its provider and falls back to heuristics on error.

## 6. Local development

```bash
npm install
npx prisma generate
npx prisma migrate deploy   # against your Supabase DB
npm run db:seed
npm run dev                 # http://localhost:3000
```

Quality gates:
```bash
npm run lint
npm run typecheck
npm run test          # vitest unit tests (no DB needed)
npm run test:int      # integration tests (needs DATABASE_URL)
npm run test:e2e      # playwright (needs running app + DB)
npm run build
```

## 7. Deployment (Vercel)

1. Import the repo in Vercel; framework auto-detected.
2. Add all env vars above in Vercel → Project → Settings → Environment Variables (`NEXT_PUBLIC_SITE_URL` = your prod URL).
3. Supabase Auth → URL Configuration: add the prod URL + `/auth/callback` redirect.
4. Run `npx prisma migrate deploy` against prod DB (locally with prod `DIRECT_URL`, or a CI step).
5. Deploy. Postinstall runs `prisma generate` automatically.

## 8. Manual configuration checklist

- [ ] Supabase project created, PostGIS enabled
- [ ] `.env.local` + `.env` filled from `.env.example`
- [ ] Migrations deployed, seed run
- [ ] Supabase Auth redirect URLs configured (dev + prod)
- [ ] Email confirmation enabled
- [ ] Google OAuth client created and pasted into Supabase (optional)
- [ ] Mapbox public token created and URL-restricted
- [ ] Mapbox secret token (optional, for real directions)
- [ ] Anthropic API key (optional, for AI features)
- [ ] Vercel env vars set; prod migrations deployed
