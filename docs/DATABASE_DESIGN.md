# Destination Diaries — Database Design

PostgreSQL (Supabase) + PostGIS, managed by Prisma migrations with raw-SQL migration steps for spatial columns, triggers, GIST indexes, and RLS policies.

Conventions: UUID PKs (`gen_random_uuid()`), `createdAt`/`updatedAt` timestamps on every table, FKs with explicit `onDelete` behavior, integer paise for money, `snake_case` table mapping via `@@map`.

## 1. Geographic hierarchy

```
State 1─* District 1─* City 1─* Place *─* PlaceCategory (via PlaceCategoryMap)
                                  Place 1─* PlaceSource / PlaceImage / PlaceOpeningHour / PlacePrice
```

| Table | Purpose | Notable columns |
|---|---|---|
| `State` | 28 states + 8 UTs | `name`, `slug` (unique), `code` (ISO 3166-2), `kind` (STATE/UT) |
| `District` | districts | `stateId`, `name`, `slug`; unique `(stateId, slug)` |
| `City` | cities/towns/villages | `districtId`, `kind` (CITY/TOWN/VILLAGE), `slug` (unique, for `/destinations/[slug]`), `lat`,`lng`,`geom`, `description`, `heroImageUrl`, `isDestination` (curated discovery flag) |
| `Place` | POIs | `cityId`, `name`, `slug`, `kind` (ATTRACTION, RESTAURANT, MUSEUM, RELIGIOUS_SITE, NATURE, SHOPPING, ACTIVITY, VIEWPOINT, OTHER), `lat`,`lng`,`geom`, `description`, `typicalVisitMins`, `verificationStatus` (UNVERIFIED/COMMUNITY/VERIFIED), `lastVerifiedAt`, `isActive` |
| `PlaceCategory` | interest taxonomy | `slug` (history, food, nature, photography, adventure, shopping, religious, museums, local-experiences, …) |
| `PlaceCategoryMap` | M:N | unique `(placeId, categoryId)` |
| `PlaceSource` | provenance | `placeId`, `provider` (OSM/MANUAL/…), `externalId`, `licence`, `attribution`, `rawRef`, `fetchedAt`; unique `(provider, externalId)` |
| `PlaceImage` | imagery | `url`, `attribution`, `licence`, `isPrimary` |
| `PlaceOpeningHour` | known hours only | `dayOfWeek` (0–6), `opensMin`,`closesMin` (minutes from midnight), `validFrom/To`, `source`; absence = unknown, never guessed |
| `PlacePrice` | entry/typical costs | `kind` (ENTRY_INDIAN, ENTRY_FOREIGNER, MEAL_AVG, ACTIVITY), `amountPaise`, `currency`, `source` (VERIFIED/PROVIDER_ESTIMATE/HEURISTIC_ESTIMATE/USER_REPORTED), `verifiedAt`, `notes` |

Spatial: `City.geom`, `Place.geom` are `geography(Point,4326)` columns created in raw SQL, synced from lat/lng by trigger, indexed with GIST. Nearby/cluster queries go through `$queryRaw`.

## 2. User data

| Table | Purpose |
|---|---|
| `Profile` | 1:1 with `auth.users` (PK = auth user id). `displayName`, `avatarUrl`, `role` (USER/ADMIN), `homeCity`. Created on first login via callback. |
| `UserPreference` | persisted defaults: `travelStyle`, `interests` (slugs[]), `dietary`, `pacePreference`, `defaultCurrency` |
| `SavedPlace` | bookmarks; unique `(profileId, placeId)` |

## 3. Trip data

| Table | Purpose / notable columns |
|---|---|
| `Trip` | `ownerId`, `title`, `destinationCityId`, `startDate`, `endDate`, `travellers`, `status` (DRAFT/GENERATING/PLANNED/ARCHIVED), `travelStyle`, `interests[]`, `transportPref`, `accommodationPref`, `specialRequirements` (text), `activeVersionId` (nullable FK → ItineraryVersion), `shareSlug` (nullable unique, for public share), `shareEnabled` |
| `TripDay` | one per date: `tripId`, `date`, `index`, `notes`; unique `(tripId, index)` |
| `ItineraryVersion` | `tripId`, `versionNumber` (unique per trip), `label`, `createdBy` (GENERATOR/REPLAN/USER_EDIT), `generationParams` (jsonb), `summary`, `isFeasible`, `infeasibilityReason` (jsonb) |
| `ItineraryStop` | `versionId`, `tripDayId`, `placeId`, `orderIndex`, `arrivalMin`,`departureMin` (minutes from day start), `visitDurationMins`, `note`, `locked` (survives replans); unique `(versionId, tripDayId, orderIndex)` |
| `RouteLeg` | `versionId`, `fromStopId`,`toStopId`, `mode` (WALK/AUTO/TAXI/BUS/TRAIN), `distanceMeters`, `durationMins`, `provider` (HEURISTIC/MAPBOX), `polyline` (nullable), `estimatedAt` |
| `TripCollaborator` | `tripId`, `profileId`, `roleInTrip` (VIEWER/EDITOR); unique `(tripId, profileId)` |

## 4. Budget

| Table | Purpose |
|---|---|
| `TripBudget` | 1:1 trip: `totalPaise`, `currency`, per-category caps (nullable jsonb `categoryCapsPaise`) |
| `ExpenseEstimate` | per version: `versionId`, `tripDayId?`, `stopId?`, `category` (ACCOMMODATION, INTERCITY_TRANSPORT, LOCAL_TRANSPORT, FOOD, ATTRACTION_ENTRY, ACTIVITIES, SHOPPING, MISC), `amountPaise`, `currency`, `source`, `confidence` (LOW/MEDIUM/HIGH), `notes` |
| `ActualExpense` | user-recorded, **separate from estimates**: `tripId`, `tripDayId?`, `category`, `amountPaise`, `currency`, `spentAt`, `note`, `enteredById` |

## 5. Operations

| Table | Purpose |
|---|---|
| `PlaceReport` | user reports: `placeId`, `reporterId?`, `kind` (CLOSED, WRONG_INFO, DUPLICATE, INAPPROPRIATE, OTHER), `detail`, `status` (OPEN/REVIEWING/RESOLVED/REJECTED), `resolvedById`, `resolutionNote` |
| `IngestionJob` | `provider`, `regionRef`, `status` (PENDING/RUNNING/SUCCEEDED/FAILED), `stats` (jsonb: fetched/created/updated/skipped), `error`, `startedAt`,`finishedAt` |
| `ProviderUsageLog` | `provider`, `operation`, `status`, `latencyMs`, `errorCode?`, `meta` (jsonb) — rate/error monitoring for `/admin/providers` |
| `GenerationLog` | `tripId`, `versionId?`, `stage`, `model?`, `inputTokens?`,`outputTokens?`, `durationMs`, `ok`, `error?` |
| `Feedback` | general feedback from `/api/feedback`: `profileId?`, `email?`, `topic`, `message`, `status` |

## 6. Indexes

- GIST on `City.geom`, `Place.geom`.
- `Place(cityId, isActive)`, `Place(kind)`, trigram (GIN) indexes on `Place.name` and `City.name` for typo-tolerant search.
- `Trip(ownerId, status)`, `ItineraryStop(versionId, tripDayId, orderIndex)`, `ExpenseEstimate(versionId, category)`, `ActualExpense(tripId, spentAt)`, `PlaceSource(provider, externalId)` unique.

## 7. Row Level Security

Applied via SQL migration (`supabase/rls/*.sql`). Service-role (Prisma) bypasses RLS; policies protect the Supabase client path and are integration-tested.

- `profiles`: user can select/update own row.
- `trips` + child tables (`trip_days`, `itinerary_versions`, `itinerary_stops`, `route_legs`, `trip_budgets`, `expense_estimates`, `actual_expenses`): owner full access; collaborators read (EDITOR: write); public read of trips only via `share_enabled` + matching `share_slug` through a security-definer function.
- `saved_places`, `user_preferences`: owner only.
- Geographic reference tables: public read, admin write.
- Ops tables: admin only (reports: insert allowed to authenticated users).

## 8. Seeding policy

`prisma/seed.ts` loads a clearly labelled sample dataset (`prisma/seed-data.ts`): all 36 states and union territories as hierarchy roots, and five geographically diverse destinations (Jaipur — Rajasthan, Kochi — Kerala, Darjeeling — West Bengal, Hampi — Karnataka, Rishikesh — Uttarakhand) with 14–15 places each.

- Place names are real; coordinates are approximate and hand-entered; visit durations are editorial rules of thumb.
- Every place is `UNVERIFIED` with a `MANUAL` `PlaceSource` record naming the sample dataset.
- **No prices, ratings or opening hours are seeded.** Those arrive only through an admin (with a stated source) or a licensed provider import.
- The seed is idempotent and records itself as an `IngestionJob`.
