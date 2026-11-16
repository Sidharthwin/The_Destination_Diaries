# API reference

All routes live under `/api` and speak JSON.

**Envelope**

```jsonc
// success
{ "data": { … } }
// failure
{ "error": { "code": "VALIDATION", "message": "Invalid input", "details": { … } } }
```

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION` | 400 | Input failed schema validation (`details` lists the fields) |
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Signed in, but not allowed (e.g. view-only collaborator, non-admin) |
| `NOT_FOUND` | 404 | Does not exist — **or belongs to someone else** (existence is never leaked) |
| `CONFLICT` | 409 | Not possible in the current state (duplicate stop, replan before generate, …) |
| `INFEASIBLE` | 422 | No itinerary can be built; `details.reasons` and `details.alternatives` explain |
| `INTERNAL` | 500 | Unexpected error |

**Authentication.** Session cookie (Supabase). The user is always derived from the verified server-side session; a user id in a request body is ignored. Money is returned as integer **paise**.

## Places (public)

### `GET /api/places/search`
Query: `q` (text, typo-tolerant), `city` (slug), `state` (slug), `kind`, `category` (interest slug), `limit` (1–50, default 20), `offset`.
Returns `{ places: PlaceCard[], cities: City[], total, limit, offset }`.

### `GET /api/places/nearby`
Query: `lat`, `lng` (required), `radiusKm` (0.1–100, default 5), `kind`, `limit`.
Returns `{ places: (PlaceCard & { distanceMeters })[] }`, nearest first (PostGIS).

### `GET /api/places/:id`
Full place: location, categories, images, `openingHours[]`, `prices[]` (each with `source`), `sources[]` (provider, licence, attribution, fetchedAt), `verificationStatus`. Empty hours/prices mean *unknown*.

### `POST /api/places/:id/report` 🔒
Body: `{ kind: "CLOSED" | "WRONG_INFO" | "DUPLICATE" | "INAPPROPRIATE" | "OTHER", detail }` → `201 { id }`.

## Trips 🔒

### `POST /api/trips`
Body: `title`, `destinationCityId`, `startDate`, `endDate` (`YYYY-MM-DD`, ≤ 21 days), `travellers` (1–20), optional `totalBudgetRupees`, `travelStyle`, `interests[]`, `transportPref`, `accommodationPref`, `specialRequirements`. → `201 { id, status: "DRAFT" }`.

### `GET /api/trips`
`{ trips: TripListItem[] }` — trips you own or collaborate on.

### `GET /api/trips/:id`
The **trip view**: `trip`, `version` (active itinerary version or `null`), `days[]` (each with `stops[]`, `warnings[]`, and each stop's `legToNext`), `versions[]`. Add `?version=<id>` to view any earlier version.

### `PATCH /api/trips/:id`
Any of: `title`, `startDate`, `endDate`, `travellers`, `totalBudgetRupees`, `travelStyle`, `interests`, `transportPref`, `accommodationPref`, `specialRequirements`, `status`, and `destinationCityId` (only before an itinerary exists). Unknown fields are rejected. The active plan's estimates are recalculated. Returns the trip view.

### `DELETE /api/trips/:id`
Owner only.

### `POST /api/trips/:id/generate`
Runs the planning pipeline and stores the result as a new version. → `201` trip view, or `422 INFEASIBLE`. An over-budget plan is still returned, with `version.isFeasible = false` and checked `version.alternatives`.

### `POST /api/trips/:id/replan`
Body: `{ reason: "REMOVED_PLACE" | "PLACE_CLOSED" | "BUDGET_DECREASED" | "RUNNING_LATE" | "DATES_CHANGED" | "SLOWER_PACE" | "OTHER", note?, paceFactor? }`.
Creates a **new** version: locked stops stay on their day, previously chosen places are favoured, removed places stay out, edited durations carry over. → `201` trip view.

### `POST /api/trips/:id/stops`
Body: `{ placeId, dayIndex, orderIndex?, visitDurationMins?, note? }`. → `201` trip view + `stopId`.

### `PATCH /api/trips/:id/stops/:stopId`
Body: any of `dayIndex`, `orderIndex`, `visitDurationMins` (10–600), `note`, `locked`. Returns the trip view + the (possibly new) `stopId`.

### `DELETE /api/trips/:id/stops/:stopId`

> Generated and replanned versions are immutable. The first manual edit forks a "Your edits" version; later edits accumulate there. Every edit re-times the day, re-estimates costs and re-checks the budget.

### `POST /api/trips/:id/versions/:versionId/activate`
Restores an earlier version as the current plan.

### `GET /api/trips/:id/budget`
`{ summary, estimates[], actuals[], unavailable[], alternatives[] }`. `summary` has total budget, estimated, actual, remaining (vs estimate and vs actual), per person, per day, and all eight categories. Every estimate line has `source` (`VERIFIED` · `PROVIDER_ESTIMATE` · `HEURISTIC_ESTIMATE` · `USER_REPORTED`) and `confidence`. `unavailable[]` lists what is deliberately not estimated.

### `POST /api/trips/:id/expenses` · `DELETE /api/trips/:id/expenses/:expenseId`
Record or remove an **actual** expense: `{ category, amountRupees, spentAt, note?, dayIndex? }`. Never changes estimates.

### `POST /api/trips/:id/share`
Body: `{ enabled }` → `{ shareEnabled, shareSlug, url }`. The public page is `/shared/:slug`.

## Account 🔒

- `GET | POST | DELETE /api/saved` — list, save or unsave a place (`{ placeId }`).
- `PATCH /api/profile` — `displayName`, `homeCity`, `travelStyle`, `interests`, `dietary`, `pacePreference`.

## Other

- `POST /api/feedback` (public) — `{ topic, message, email? }` → `201`.
- `POST | DELETE /api/dev-auth` — local development sign-in; returns 404 unless `NODE_ENV !== "production"` and `DEV_AUTH=1`.

Admin operations are server actions (`src/app/admin/actions.ts`), each of which re-checks admin rights on the server.
