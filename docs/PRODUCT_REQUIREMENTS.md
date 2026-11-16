# Destination Diaries — Product Requirements

> **Tagline:** "Your next adventure, intelligently planned."

Destination Diaries is an India-wide AI-powered travel planning and itinerary optimization platform. It is **not** a generic AI itinerary chatbot: its differentiator is an optimization-based planning engine that combines geographic data, travel-time calculation, scheduling, budget validation, and AI personalization.

## 1. Goals

- Discover travel destinations throughout India (states, cities, towns, villages, attractions, experiences).
- Create personalized trips with budget, dates, travellers, travel style, and interests.
- Generate realistic day-wise itineraries with deterministic scheduling and budget arithmetic.
- Calculate routes, distances, and estimated travel durations.
- Break down accommodation, food, transport, and attraction costs with honest provenance (verified / estimate / user-entered / unavailable).
- Edit itineraries and intelligently replan without destroying history (itinerary versioning).
- Save, revisit, and share trips.

## 2. Non-goals (first release)

- Real-time hotel availability or live transport fares (never fabricated).
- Bookings/payments.
- Full verified coverage of every Indian POI — we ship a representative multi-region dataset plus a scalable ingestion pipeline, and we never claim coverage the data does not support.
- Microservices — first release is a modular monolith.

## 3. Core principles

1. **Nationwide architecture.** No city is hardcoded into core logic. Jaipur is one *test* destination among several geographically diverse seeds (e.g. Jaipur, Kochi, Darjeeling, Hampi, Rishikesh).
2. **Deterministic core, AI at the edges.** Scheduling, routing, and budget arithmetic are deterministic, testable code. AI handles preference interpretation, personalization, and explanation — always validated with Zod before use.
3. **Honest data.** Every place fact carries source provenance and last-verified timestamps. Missing data is shown as missing, never invented.
4. **Everything works.** No dead links, decorative buttons, or fake functionality.

## 4. User-facing features

### 4.1 Discovery
- Full-text + geographic place search across a normalized hierarchy (State → District → City → Place).
- Destination detail pages (`/destinations/[slug]`) with places, categories, imagery, attribution.
- Nearby search (PostGIS radius queries) from any trip.

### 4.2 Trip creation wizard (10 steps)
Destination → dates → travellers → total budget → travel style (Budget, Backpacking, Adventure, Relaxation, Cultural, Family, Luxury) → interests (History, Food, Nature, Photography, Adventure, Shopping, Religious, Museums, Local experiences) → transport preference → accommodation preference → special requirements → review & generate. Draft saving, full validation.

### 4.3 Itinerary engine
Pipeline: validate prefs → retrieve candidates → filter → score → geographic clustering → travel-time estimates → visit-duration allocation → daily schedule construction → opening-hours & budget validation → expenditure calculation → itinerary + AI explanations. Heuristic optimizer (explicitly not claimed optimal). Structured infeasibility explanations with alternatives.

### 4.4 Budget
Categories: accommodation, intercity transport, local transport, food, attraction entry, activities, shopping, miscellaneous. Shows total, estimated, actual, remaining, per-person, per-day, category breakdown. Estimates and actuals stored separately; every amount carries currency, source, and confidence.

### 4.5 Trip workspace
Desktop: timeline left, interactive Mapbox map right, summary top, budget panel. Mobile: day selector, map/list toggle, bottom-sheet details. Add/remove/reorder/replace stops, change durations, recalculate, compare versions. All edits persisted.

### 4.6 Replanning
Handles: removed destination, closed attraction, reduced budget, overruns, date changes, pace changes. Creates a new `ItineraryVersion`; preserves prior decisions where possible; revalidates time, hours, and budget.

### 4.7 Accounts
Supabase Auth: email+password with verification, Google OAuth, password recovery, cookie sessions (`@supabase/ssr`), RLS on user-owned data, profile + preferences.

### 4.8 Admin
Place management, report review, duplicate identification, provenance review, ingestion job monitoring/retry, provider error monitoring, verification workflow. AI output is never an authoritative source.

## 5. Page inventory

**Public:** `/`, `/explore`, `/destinations/[slug]`, `/how-it-works`, `/about`, `/contact`, `/privacy`, `/terms`, `/cookies`
**Auth:** `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/auth/callback`
**App:** `/dashboard`, `/trips/new`, `/trips/[id]/generating`, `/trips/[id]`, `/trips/[id]/budget`, `/trips/[id]/nearby`, `/trips/[id]/share`, `/my-trips`, `/saved`, `/profile`
**Admin:** `/admin`, `/admin/places`, `/admin/places/review`, `/admin/ingestion`, `/admin/feedback`, `/admin/providers`

## 6. Design direction

Premium travel editorial publication meets modern planning app. Avoid generic AI-SaaS gradients/card grids.

- **Palette:** warm cream `#F5F1E8`, forest green `#173D32`, terracotta `#D97757`, sand `#D8C9A9`, ink `#252923`.
- **Type:** editorial serif headings (DM Serif Display / Cormorant Garamond), Inter/Manrope for UI.
- **Landing:** transparent nav over cinematic hero, large editorial headline, destination search, horizontal discovery gallery, feature storytelling, interactive itinerary demo, budget showcase, travel-style discovery, sample workspace, strong CTA, detailed footer. No fabricated testimonials.
- **Motion:** Motion for React — hero entrance, staggered headline, scroll reveals, horizontal gallery, subtle parallax, animated counters, hover effects, timeline reveals, map-marker interaction. Transform/opacity only; respects `prefers-reduced-motion`. Workspace stays calm and efficient.

## 7. Provider & licensing constraints

- OpenStreetMap data with ODbL compliance and visible attribution.
- Mapbox GL JS for maps; Mapbox Geocoding/Directions only where Indian coverage is verified; Mapbox Search Box is **not** the primary India POI source.
- No scraping in violation of usage policies; no storing third-party data without licence rights.
- Provider-independent place discovery interface (adapter pattern) so sources can be added later.
- Secrets server-side only; public keys documented explicitly.

## 8. Success criteria

Each milestone's acceptance tests pass (lint, typecheck, unit, integration, E2E, production build) before the milestone is called complete. See `TESTING_STRATEGY.md`.
