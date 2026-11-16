# Destination Diaries — Testing Strategy

## 1. Layers

| Layer | Tool | Needs | What it covers |
|---|---|---|---|
| Unit | Vitest | nothing | Pure logic: scorer, clusterer, scheduler, routing heuristics, budget arithmetic, money utils, Zod schemas, infeasibility explanations |
| Integration | Vitest + Prisma (+ Supertest-style handler invocation) | `DATABASE_URL` (test DB/branch) | API route handlers end-to-end against a real Postgres: auth guards, ownership, place search, PostGIS nearby, trip CRUD, generation pipeline, versioning, replanning, RLS policies |
| E2E | Playwright | running app + DB | Real user journeys in a browser, desktop + mobile viewports |

Scripts: `npm run test` (unit), `npm run test:int`, `npm run test:e2e`, plus `lint`, `typecheck`, `build`. CI order: lint → typecheck → unit → build → integration → e2e.

## 2. Unit test priorities (deterministic core)

- **Scheduler**: respects daily time limits; inserts travel legs between stops; honors opening hours when known; skips (never guesses) unknown hours; no overlapping stops; meal-break insertion; day-boundary correctness.
- **Optimizer/scorer**: interest match scoring is explainable (returns per-factor breakdown); variety constraint; backtracking penalty reduces zig-zag distance vs naive order on fixture data.
- **Clusterer**: groups by geographic proximity; stable for identical input.
- **Routing heuristic**: haversine correctness against known city-pair distances (±tolerance); mode speed factors; estimate labelling.
- **Budget engine**: integer-paise arithmetic (no floats); category totals; per-person/per-day division incl. remainders; estimates vs actuals never mixed; over-budget detection produces structured INFEASIBLE with alternatives.
- **Validation**: every API Zod schema accepts valid/rejects invalid fixtures; LLM output schemas reject malformed model output (fallback path covered).

## 3. Integration tests

- Auth: unauthenticated requests → 401; wrong-owner access → 404/403; admin routes reject non-admins.
- RLS: using anon-key Supabase client, user A cannot read user B's trips; share-slug path exposes only shared trips.
- Places: text search finds seeded places across multiple states (proves no city hardcoding); nearby returns distance-ordered PostGIS results; `:id` returns provenance + attribution.
- Trips: create/read/update/delete; draft wizard persistence; date validation.
- Generation: seeded Jaipur **and** Kochi trips both generate feasible multi-day itineraries (nationwide proof); impossible budget → 422 INFEASIBLE with alternatives; new `ItineraryVersion` per run; `GenerationLog` written.
- Replanning: removing a stop creates a new version preserving locked stops; old version intact.
- Stops: add/reorder/delete persist and reindex correctly.
- Budget API: totals match engine output; actual expense entry does not mutate estimates.

## 4. Playwright E2E journeys (spec §17)

1. New user registration (email) — mock/inbucket note: verification handled via Supabase test helpers or documented manual step.
2. Google OAuth flow — smoke: button redirects to Google consent (full round-trip documented as manual, since it needs real Google credentials).
3. Trip creation via the 10-step wizard.
4. Place discovery (explore + search + destination page).
5. Itinerary generation (generating screen → workspace).
6. Budget validation display (estimates, provenance badges, remaining).
7. Itinerary editing (reorder, remove, duration change → persisted after reload).
8. Saving and reopening trips (`/my-trips`).
9. Unauthorized access attempts (visiting `/dashboard`, `/trips/:id` of another user while logged out/in).

Run on desktop Chromium + iPhone-size viewport. Reduced-motion is enabled in E2E to keep tests deterministic.

## 5. Policies

- A milestone is **not complete** until its acceptance tests pass.
- No test may depend on a live third-party API: Mapbox/LLM providers are faked at the interface boundary; the heuristic path is the tested default.
- Test data comes from the seed script or per-test factories; tests never assert on fabricated "verified" real-world facts.
- Flaky tests are fixed or quarantined with an issue, never ignored.
