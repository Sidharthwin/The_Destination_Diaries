# Destination Diaries — Architecture

## 1. Overview

A **modular monolith** on Next.js App Router, deployed to Vercel, with Supabase providing PostgreSQL (+PostGIS), Auth, and Storage. No microservices in the first release.

```
┌────────────────────────────────────────────────────────────┐
│ Next.js (Vercel)                                           │
│  app/(public)   app/(auth)   app/(app)   app/admin         │
│  app/api/* ── Route Handlers (thin: parse → service → res) │
│                                                            │
│  src/server/services/*   ← business logic (deterministic)  │
│  src/server/providers/*  ← external adapters (OSM, Mapbox, │
│                            LLM) behind interfaces          │
│  src/server/db/*         ← Prisma client + query helpers   │
│  src/server/auth/*       ← Supabase SSR session helpers    │
│  src/lib/validation/*    ← Zod schemas (shared FE/BE)      │
└───────────────┬────────────────────────────────────────────┘
                │
┌───────────────▼───────────────┐   ┌───────────────────────┐
│ Supabase                      │   │ External              │
│  PostgreSQL + PostGIS (gis    │   │  Mapbox GL / Directions│
│  schema), Auth, Storage, RLS  │   │  OSM/Overpass imports  │
└───────────────────────────────┘   │  LLM provider (config) │
                                    └───────────────────────┘
```

## 2. Directory layout

```
src/
  app/
    (public)/            # /, /explore, /destinations/[slug], /how-it-works, /about, /contact, legal
    (auth)/              # /login, /signup, /forgot-password, /reset-password
    auth/callback/       # OAuth + email-link code exchange (route handler)
    (app)/               # /dashboard, /trips/*, /my-trips, /saved, /profile  (protected)
    admin/               # /admin/* (role-gated)
    api/                 # REST route handlers
  components/
    ui/                  # shadcn/ui primitives
    marketing/           # landing page sections
    map/                 # Mapbox wrappers
    trip/                # workspace, wizard, timeline, budget
    layout/              # nav, footer, shells
  server/
    auth/                # createServerSupabase, requireUser, requireAdmin
    db/                  # prisma singleton, spatial query helpers
    services/            # discovery, places, trips, itinerary, optimizer,
                         # routing, budget, replanning, recommendations
    providers/           # provider interfaces + adapters
      places/            #   PlaceProvider: osm-seed, (future: overpass, mapbox)
      routing/           #   RoutingProvider: haversine-heuristic, mapbox-directions
      llm/               #   LlmProvider: anthropic (default), configurable
  lib/
    validation/          # Zod schemas for every API input/output + LLM I/O
    utils/               # formatting, dates, money (integer paise)
    constants/           # travel styles, interests, categories
prisma/
  schema.prisma
  migrations/            # includes raw SQL for PostGIS columns + GIST indexes
  seed.ts
supabase/
  rls/                   # RLS policy SQL, applied via migration
tests/
  unit/  integration/  e2e/
docs/
```

## 3. Key decisions

### 3.1 Route handlers are thin
Every `app/api/*` handler: (1) derive user from verified server session — never from the body, (2) Zod-parse input, (3) call a service, (4) map service results/errors to a consistent envelope `{ data }` / `{ error: { code, message, details? } }` with proper status codes. Ownership checks live in services and are mandatory for all protected resources.

### 3.2 Provider adapter pattern
`PlaceProvider`, `RoutingProvider`, and `LlmProvider` are TypeScript interfaces. Core services depend only on interfaces; adapters are chosen by env config. This keeps the system provider-independent (spec §5) and lets us add Overpass/Mapbox/other sources without touching core logic. Every imported record stores `PlaceSource` provenance (provider, external id, licence, fetchedAt).

### 3.3 Deterministic core, validated AI edge
The optimizer, scheduler, router, and budget engine are pure, unit-tested TypeScript. The LLM is used for: interpreting free-text special requirements into structured preferences, ranking tie-breaks, and generating human explanations. All LLM I/O passes Zod validation; on validation failure we fall back to deterministic output, never to raw model text. LLM calls are logged in `GenerationLog`.

### 3.4 Geography: Prisma + PostGIS side-by-side
Prisma does not natively model geometry. Pattern: each geocoded table has `lat`/`lng` doubles managed by Prisma **and** a `geom geography(Point,4326)` column added by raw SQL migration, kept in sync by a trigger. Spatial queries (`nearby`, clustering radius) use `prisma.$queryRaw` against GIST indexes. PostGIS lives in the default-enabled `extensions`/`gis` schema on Supabase.

### 3.5 Itinerary versioning
Generation and every replan create a new `ItineraryVersion` (with stops + route legs) linked to the `Trip`; the trip points at `activeVersionId`. History is never destroyed; versions are comparable in the UI.

### 3.6 Money
All amounts are integer **paise** (INR minor units) with a `currency` field, avoiding float drift. Every amount row carries `source` (`VERIFIED | PROVIDER_ESTIMATE | USER_ENTERED | HEURISTIC_ESTIMATE`) and `verifiedAt` where applicable. UI renders provenance badges; "unavailable" is a first-class display state.

### 3.7 Auth & authorization
`@supabase/ssr` cookie sessions. Server components/handlers call `requireUser()` (reads verified session via `supabase.auth.getUser()`). Admin routes check `Profile.role = 'ADMIN'`. RLS policies on all user-owned tables as defense-in-depth; the app's Prisma connection uses the service role but RLS protects direct PostgREST/API access. Middleware refreshes sessions and guards `(app)` and `admin` route groups.

### 3.8 Routing estimates
Default `RoutingProvider` is a calibrated heuristic: haversine distance × road-winding factor × mode speed (walk/auto/car/bus), clearly labelled as an estimate. `MapboxDirectionsProvider` is used when `MAPBOX_SECRET_TOKEN` is set and the route is within verified Indian coverage; results cached in `RouteLeg` with provider provenance. The engine never blocks on a third-party outage — it degrades to the heuristic and labels it.

### 3.9 Error handling
Services throw typed `ServiceError` (`NOT_FOUND`, `FORBIDDEN`, `VALIDATION`, `CONFLICT`, `INFEASIBLE`, `PROVIDER_ERROR`); the API layer maps them to 404/403/400/409/422/502. `INFEASIBLE` carries a structured explanation + alternatives (spec §12).

## 4. Data flow: generate itinerary

```
POST /api/trips/:id/generate
 → requireUser + ownership check
 → ItineraryService.generate(trip)
    1. preferences = PreferenceParser(trip, LLM?)        [validated]
    2. candidates  = DiscoveryService.candidates(destination, prefs)
    3. scored      = Scorer.score(candidates, prefs)      [pure]
    4. clusters    = GeoClusterer.cluster(scored)         [pure]
    5. legs        = RoutingService.estimate(clusters)    [provider]
    6. schedule    = Scheduler.build(clusters, legs, hours, dayLimits) [pure]
    7. budgetCheck = BudgetEngine.validate(schedule, tripBudget)      [pure]
    8. persist ItineraryVersion + Stops + RouteLegs + ExpenseEstimates
    9. explanations = LLM.explain(schedule)               [validated, optional]
 → 201 { itineraryVersion }   |   422 { error: INFEASIBLE, alternatives }
```

## 5. Environment & deployment

Vercel (app) + Supabase (DB/Auth/Storage). All secrets server-side; only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN` are public by design. Full list in `ENVIRONMENT_SETUP.md`. The app boots without optional providers (Mapbox Directions, LLM) and degrades gracefully with labelled heuristics.
