# Known limitations and roadmap

A candid list. Nothing here is hidden behind the interface: where the product does not know something, it says so.

## Not verified end to end

These are implemented but depend on accounts that were not available during development, so they have not been exercised against the real services:

| Feature | What was tested | What remains |
|---|---|---|
| Supabase Auth (email, Google OAuth, verification, recovery) | Session handling, route protection, authorisation and the callback's redirect safety, through a local development sign-in | The real sign-up, confirmation email, Google hand-off and password reset. Two Playwright tests cover part of this and run automatically once Supabase variables are set. |
| Mapbox GL map | The schematic fallback (used when no token is set) | Tile rendering, markers and route lines on the live map |
| Mapbox Directions | The routing interface, with a fake provider: measured legs are used and labelled, failures fall back per leg | A live call |
| AI provider | Validation, fallback and "AI cannot change the schedule", with fake providers | A live model call |
| OpenStreetMap import | Tag normalisation; the pipeline's de-duplication, idempotency, failure recording and retry, with a fake provider | A live Overpass request — the public endpoint returned 502 when tried |
| Row Level Security | Policies tested against a local PostgreSQL role using the same `auth.uid()` contract | The same checks through Supabase's own API |

## Data

- **Coverage is five destinations and 73 places.** This is a representative sample, not nationwide coverage. All 36 states and union territories exist in the hierarchy, but most have no places yet.
- **Sample coordinates are approximate** and hand-entered; every sample place is marked unverified.
- **No opening hours or prices are seeded.** Until an admin or a licensed source adds them, the planner treats hours as unknown and budgets omit entry fees (and say so).
- **Photography** exists for destinations only, not individual places.

## Planning engine

- **Heuristic, not optimal.** Clustering is k-means with a balancing pass; ordering is nearest-neighbour with 2-opt. Good plans quickly, not provably the best.
- **Travel times are estimates** unless Mapbox Directions is configured: straight-line distance × a winding factor at an assumed speed per mode. Hill roads and city traffic will differ. Bus and train legs are always estimates.
- **Days start at the first stop.** The engine does not know where you are staying, so it does not add travel from your accommodation.
- **One destination per trip.** Multi-city routes are not supported yet.
- **Budget estimates are planning assumptions** (editable in `src/server/services/budget/engine.ts`), not quotes. Intercity transport and shopping are deliberately not estimated.
- **Date changes need a replan.** Shortening a trip hides the stops on removed days until you replan.

## Product

- **Collaborators** exist in the data model and access rules, but there is no screen for inviting them yet.
- **Sharing** is by unguessable link, read-only. There is no per-person access control on shared links.
- **Place reports** can be filed from a stop's details in the workspace, but not yet from public destination pages.
- **Legal pages** are plain-language summaries and need professional review before launch.
- **No rate limiting** on public endpoints yet (search, nearby, feedback).
- **Generation runs inside the request.** That is fine today (well under a second without external calls) but should move to a background job if imports and AI make it slow.
- **English only**, rupees only.

## Roadmap

1. **Verify against live services** — the checklist in DEPLOYMENT.md §4.
2. **Grow verified data** — OSM imports city by city with admin review; add licensed sources for hours and prices through the provider interface.
3. **Rate limiting and abuse protection** on public endpoints.
4. **Accommodation-aware days** — let travellers pin where they stay and route from there.
5. **Multi-city trips** with intercity legs.
6. **Collaboration** — invitations, editor/viewer roles in the interface.
7. **Background generation** with progress updates.
8. **Stronger optimisation** — time-window-aware local search; compare against an exact solver on small instances to measure the gap.
9. **Offline-friendly itinerary** and calendar export.
10. **Hindi and other Indian languages.**
