# Destination Diaries

> Your next adventure, intelligently planned.

Destination Diaries is a trip planner for India. Its core is not a chatbot but a **planning engine**: it scores places against what you care about, groups them into days by geography, schedules them against the clock and opening hours, adds up the cost in exact rupees — and only then uses AI (optionally) to describe the result. Plans can be edited, replanned, versioned and shared.

It is a modular monolith: Next.js (App Router) + PostgreSQL/PostGIS via Prisma + Supabase Auth + Mapbox.

## What works today

| Area | Status |
|---|---|
| Public site: landing, explore, destination pages, how-it-works, about, contact, legal | ✅ |
| Place search (typo-tolerant), filters, PostGIS nearby search | ✅ tested |
| Trip wizard (10 steps, draft saving), trip CRUD | ✅ tested |
| Itinerary engine: scoring, clustering, ordering, scheduling, opening hours | ✅ tested |
| Budget engine: integer-paise arithmetic, provenance labels, estimates vs actuals | ✅ tested |
| Workspace: timeline + map, reorder / add / remove / replace / duration / lock, versions | ✅ tested |
| Replanning into new versions; restore any version | ✅ tested |
| Sharing by private link | ✅ tested |
| Admin: places, hours, prices, review queue, duplicates, ingestion, feedback, providers | ✅ tested |
| Auth: email + password, Google OAuth, verification, recovery (Supabase) | ⚠️ implemented, **needs your Supabase project to verify** |
| Mapbox interactive map and measured directions | ⚠️ implemented, **needs your Mapbox tokens to verify** |
| AI summaries and requirement interpretation | ⚠️ implemented and tested with a fake provider; **needs an API key to verify live** |
| OpenStreetMap import (Overpass) | ⚠️ normalisation and pipeline tested; the live endpoint was unavailable when last checked |

See [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) for the full, candid list.

## Quick start (local, no accounts needed)

Requires Node.js 20+ (22+ recommended) and Docker.

```bash
npm install

# 1. A local PostGIS database
docker run -d --name destination-diaries-db \
  -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=destination_diaries \
  -p 54329:5432 postgis/postgis:16-3.4

# 2. Environment (Prisma CLI reads .env; Next.js reads .env.local)
cat > .env <<'ENV'
DATABASE_URL=postgresql://postgres:devpassword@localhost:54329/destination_diaries
DIRECT_URL=postgresql://postgres:devpassword@localhost:54329/destination_diaries
ENV
cp .env .env.local && echo "DEV_AUTH=1" >> .env.local

# 3. Schema + sample data, then run
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000. With `DEV_AUTH=1`, the sign-in page offers three local test identities (traveller, second traveller, admin) so you can use everything before connecting Supabase. That switch is ignored in production builds.

To connect real accounts, maps and AI, follow [docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm test` | Unit tests — pure engine logic, no database (56 tests) |
| `npm run test:int` | Integration tests — real route handlers against a real database (36 tests) |
| `npm run test:e2e` | Playwright journeys, desktop + mobile (26 tests, 2 need Supabase credentials) |
| `npm run db:migrate` · `npm run db:seed` | Apply migrations · load the sample dataset |

## How the engine works

```
preferences → candidate places (PostGIS radius) → explainable scoring
  → select what fits (with variety) → cluster into days (k-means + balancing)
  → order each day (nearest-neighbour + 2-opt) → clock times, lunch, opening hours
  → repair (move / drop with reasons / fill spare time)
  → route legs (heuristic, or measured via Mapbox) → cost estimate → budget check
  → persist as a new ItineraryVersion → optional AI wording (validated)
```

- **Deterministic and tested.** `src/server/services/optimizer` and `src/server/services/budget` are pure TypeScript with no I/O.
- **Heuristic, not optimal** — and the product says so.
- **Honest data.** Sample places are marked unverified. Prices, ratings and opening hours are never invented; unknowns are shown as unknown. Every cost line carries its source.
- **AI at the edges only.** Model output is schema-validated and can change wording and interpreted preferences — never times, routes or money. Without an API key the product is fully functional.
- **Nothing city-specific.** The same code plans all five sample destinations; integration tests prove it for each.

## Project layout

```
src/app            routes: (public) (auth) (app) admin api shared
src/components     ui (shadcn) · layout · marketing · map · places · trip · auth · motion
src/server         auth · db · services (optimizer, budget, itinerary, trips, places, ingestion) · providers (llm, routing, places)
src/lib            validation (Zod) · constants · utils · supabase
prisma             schema, migrations (init → PostGIS/search → RLS), seed
tests              unit · integration · e2e
docs               requirements, architecture, database, API, setup, deployment, testing, limitations
```

## Documentation

- [Product requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Database design](docs/DATABASE_DESIGN.md)
- [API reference](docs/API.md)
- [Environment setup & manual configuration checklist](docs/ENVIRONMENT_SETUP.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Testing strategy](docs/TESTING_STRATEGY.md)
- [Implementation plan & status](docs/IMPLEMENTATION_PLAN.md)
- [Known limitations & roadmap](docs/KNOWN_LIMITATIONS.md)

## Data and credits

Sample place data is hand-curated and unverified (see `prisma/seed-data.ts`). The import pipeline supports OpenStreetMap data — © OpenStreetMap contributors, ODbL 1.0 — with provenance stored per record. Photographs are by Wikimedia Commons contributors under CC BY / CC BY-SA; see [public/images/destinations/CREDITS.md](public/images/destinations/CREDITS.md).
