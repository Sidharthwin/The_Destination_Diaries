# Destination Diaries — Implementation Plan & Checklist

Phased execution. A phase is complete only when its acceptance checks pass (lint, typecheck, relevant tests, build). Status legend: [ ] pending · [~] in progress · [x] done.

## PHASE 0 — Repository inspection & architecture docs
- [x] Inspect repo (empty: README only, single commit on `main`)
- [x] docs/PRODUCT_REQUIREMENTS.md
- [x] docs/ARCHITECTURE.md
- [x] docs/DATABASE_DESIGN.md
- [x] docs/IMPLEMENTATION_PLAN.md
- [x] docs/ENVIRONMENT_SETUP.md
- [x] docs/TESTING_STRATEGY.md

## PHASE 1 — Project & database foundation
- [ ] Next.js (App Router, TS, Tailwind, src dir) scaffold; `.env.example`
- [ ] Prisma schema (all tables in DATABASE_DESIGN.md) + migrations incl. PostGIS SQL
- [ ] RLS policy SQL
- [ ] Seed script (5 diverse destinations, honest provenance)
- [ ] Prisma singleton, money utils, ServiceError, API envelope helpers
- Acceptance: `npm run lint && npm run typecheck && npm run build` green; `prisma validate` green

## PHASE 2 — Design system & public website
- [ ] Tailwind theme tokens (palette, serif/sans fonts), shadcn/ui base components
- [ ] Layout: transparent nav, footer
- [ ] Landing page (all 13 sections, Motion animations, reduced-motion safe)
- [ ] /explore, /destinations/[slug] (DB-driven), /how-it-works, /about, /contact (working form → /api/feedback), /privacy, /terms, /cookies
- Acceptance: all public routes render, no dead links, mobile responsive, build green

## PHASE 3 — Authentication
- [ ] Supabase SSR clients (browser/server/middleware), session refresh middleware
- [ ] /signup (email verification), /login, Google OAuth + /auth/callback, /forgot-password, /reset-password, logout
- [ ] Profile auto-creation; protected route groups; requireUser/requireAdmin
- [ ] docs: Google OAuth manual configuration guide
- Acceptance: auth unit tests + manual flow check; unauthorized access redirects

## PHASE 4 — Geographic data & search
- [ ] PlaceProvider interface + seed/OSM adapter; ingestion pipeline skeleton + IngestionJob tracking
- [ ] GET /api/places/search (text + filters), /api/places/nearby (PostGIS), /api/places/:id
- [ ] Explore/destination pages wired to live search; Mapbox map components
- Acceptance: search/nearby integration tests pass against seeded DB

## PHASE 5 — Trip creation & persistence
- [ ] 10-step wizard (draft save, validation) → POST /api/trips
- [ ] Trip CRUD APIs (GET/PATCH/DELETE, ownership enforced), /my-trips, /dashboard
- Acceptance: trip CRUD integration tests; wizard E2E happy path

## PHASE 6 — Optimization & budget engines
- [ ] Scorer, GeoClusterer, RoutingProvider (heuristic + optional Mapbox), Scheduler, BudgetEngine — pure modules
- [ ] POST /api/trips/:id/generate pipeline + ItineraryVersion persistence + GenerationLog
- [ ] Structured INFEASIBLE responses with alternatives
- [ ] LLM provider interface + Zod-validated explanations (optional at runtime)
- Acceptance: comprehensive unit tests (scheduling, opening hours, budget arithmetic, clustering); generation integration test

## PHASE 7 — Trip workspace & replanning
- [ ] Workspace: timeline + map + summary + budget panel (desktop), day selector/bottom sheet (mobile)
- [ ] Stop add/remove/reorder/duration APIs + UI; version compare
- [ ] POST /api/trips/:id/replan (new version, preserves locked stops)
- [ ] /trips/[id]/budget (estimates vs actuals), /trips/[id]/nearby, /trips/[id]/share (share slug)
- [ ] /saved, /profile (preferences)
- Acceptance: editing persists; replanning tests; budget math tests

## PHASE 8 — Admin, testing, polish, deployment
- [ ] /admin dashboard, places CRUD + review queue, ingestion monitor, feedback, providers
- [ ] Playwright E2E journeys (9 flows from spec §17)
- [ ] Responsive polish pass; accessibility pass; README, API docs, deployment guide, known limitations
- Acceptance: full suite green + production build

## Working rules
- Never hardcode a city into core logic; Jaipur is test data only.
- Deterministic math in services; LLM output always Zod-validated.
- No dead buttons/links; every edit persists.
- Commit at logical milestones.
