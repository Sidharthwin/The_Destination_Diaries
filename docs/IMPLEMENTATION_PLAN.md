# Destination Diaries — Implementation Plan & Checklist

Phased execution. A phase is complete only when its acceptance checks pass (lint, typecheck, relevant tests, build). Status legend: [ ] pending · [~] in progress · [x] done.

**Status: all phases implemented.** Verified locally: lint and typecheck clean, 56 unit tests, 36 integration tests, 24 end-to-end tests (2 more skip until Supabase credentials exist), production build. Items that depend on external accounts (Supabase Auth, Mapbox, AI, live OpenStreetMap) are implemented but not verified against the real services — see KNOWN_LIMITATIONS.md.

## PHASE 0 — Repository inspection & architecture docs
- [x] Inspect repo (empty: README only, single commit on `main`)
- [x] docs/PRODUCT_REQUIREMENTS.md
- [x] docs/ARCHITECTURE.md
- [x] docs/DATABASE_DESIGN.md
- [x] docs/IMPLEMENTATION_PLAN.md
- [x] docs/ENVIRONMENT_SETUP.md
- [x] docs/TESTING_STRATEGY.md

## PHASE 1 — Project & database foundation
- [x] Next.js (App Router, TS, Tailwind, src dir) scaffold; `.env.example`
- [x] Prisma schema (all tables in DATABASE_DESIGN.md) + migrations incl. PostGIS SQL
- [x] RLS policy SQL
- [x] Seed script (5 diverse destinations, honest provenance)
- [x] Prisma singleton, money utils, ServiceError, API envelope helpers
- Acceptance: `npm run lint && npm run typecheck && npm run build` green; `prisma validate` green

## PHASE 2 — Design system & public website
- [x] Tailwind theme tokens (palette, serif/sans fonts), shadcn/ui base components
- [x] Layout: transparent nav, footer
- [x] Landing page (all 13 sections, Motion animations, reduced-motion safe)
- [x] /explore, /destinations/[slug] (DB-driven), /how-it-works, /about, /contact (working form → /api/feedback), /privacy, /terms, /cookies
- Acceptance: all public routes render, no dead links, mobile responsive, build green

## PHASE 3 — Authentication
- [x] Supabase SSR clients (browser/server), session refresh in `src/proxy.ts` (Next 16 renamed middleware → proxy)
- [x] /signup (email verification), /login, Google OAuth + /auth/callback, /forgot-password, /reset-password, logout
- [x] Profile auto-creation; protected route groups; requireUser/requireAdmin
- [x] docs: Google OAuth manual configuration guide
- Acceptance: authorization integration + e2e tests pass via local dev sign-in; **real Supabase flows still need a manual check** (DEPLOYMENT.md §4)

## PHASE 4 — Geographic data & search
- [x] PlaceProvider interface + seed/OSM adapter; ingestion pipeline skeleton + IngestionJob tracking
- [x] GET /api/places/search (text + filters), /api/places/nearby (PostGIS), /api/places/:id
- [x] Explore/destination pages wired to live search; Mapbox map components
- Acceptance: search/nearby integration tests pass against seeded DB

## PHASE 5 — Trip creation & persistence
- [x] 10-step wizard (draft save, validation) → POST /api/trips
- [x] Trip CRUD APIs (GET/PATCH/DELETE, ownership enforced), /my-trips, /dashboard
- Acceptance: trip CRUD integration tests; wizard E2E happy path

## PHASE 6 — Optimization & budget engines
- [x] Scorer, GeoClusterer, RoutingProvider (heuristic + optional Mapbox), Scheduler, BudgetEngine — pure modules
- [x] POST /api/trips/:id/generate pipeline + ItineraryVersion persistence + GenerationLog
- [x] Structured INFEASIBLE responses with alternatives
- [x] LLM provider interface + Zod-validated explanations (optional at runtime)
- Acceptance: comprehensive unit tests (scheduling, opening hours, budget arithmetic, clustering); generation integration test

## PHASE 7 — Trip workspace & replanning
- [x] Workspace: timeline + map + summary + budget panel (desktop), day selector/bottom sheet (mobile)
- [x] Stop add/remove/reorder/duration APIs + UI; version compare
- [x] POST /api/trips/:id/replan (new version, preserves locked stops)
- [x] /trips/[id]/budget (estimates vs actuals), /trips/[id]/nearby, /trips/[id]/share (share slug)
- [x] /saved, /profile (preferences)
- Acceptance: editing persists; replanning tests; budget math tests

## PHASE 8 — Admin, testing, polish, deployment
- [x] /admin dashboard, places CRUD + review queue, ingestion monitor, feedback, providers
- [x] Playwright E2E journeys (9 flows from spec §17)
- [x] Responsive polish pass; accessibility pass; README, API docs, deployment guide, known limitations
- Acceptance: full suite green + production build

## Working rules
- Never hardcode a city into core logic; Jaipur is test data only.
- Deterministic math in services; LLM output always Zod-validated.
- No dead buttons/links; every edit persists.
- Commit at logical milestones.
