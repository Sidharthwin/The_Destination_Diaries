-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StateKind" AS ENUM ('STATE', 'UNION_TERRITORY');

-- CreateEnum
CREATE TYPE "CityKind" AS ENUM ('CITY', 'TOWN', 'VILLAGE');

-- CreateEnum
CREATE TYPE "PlaceKind" AS ENUM ('ATTRACTION', 'RESTAURANT', 'MUSEUM', 'RELIGIOUS_SITE', 'NATURE', 'SHOPPING', 'ACTIVITY', 'VIEWPOINT', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'COMMUNITY', 'VERIFIED');

-- CreateEnum
CREATE TYPE "DataProvider" AS ENUM ('OSM', 'MANUAL', 'MAPBOX', 'USER');

-- CreateEnum
CREATE TYPE "PriceKind" AS ENUM ('ENTRY_INDIAN', 'ENTRY_FOREIGNER', 'MEAL_AVG', 'ACTIVITY');

-- CreateEnum
CREATE TYPE "AmountSource" AS ENUM ('VERIFIED', 'PROVIDER_ESTIMATE', 'HEURISTIC_ESTIMATE', 'USER_ENTERED', 'USER_REPORTED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "TravelStyle" AS ENUM ('BUDGET', 'BACKPACKING', 'ADVENTURE', 'RELAXATION', 'CULTURAL', 'FAMILY', 'LUXURY');

-- CreateEnum
CREATE TYPE "TransportPref" AS ENUM ('PUBLIC_TRANSPORT', 'CAR_WITH_DRIVER', 'SELF_DRIVE', 'TWO_WHEELER', 'WALKING_FOCUSED', 'MIXED');

-- CreateEnum
CREATE TYPE "AccommodationPref" AS ENUM ('HOSTEL', 'BUDGET_HOTEL', 'MID_RANGE_HOTEL', 'LUXURY_HOTEL', 'HOMESTAY', 'RESORT');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'GENERATING', 'PLANNED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VersionOrigin" AS ENUM ('GENERATOR', 'REPLAN', 'USER_EDIT');

-- CreateEnum
CREATE TYPE "TravelMode" AS ENUM ('WALK', 'AUTO', 'TAXI', 'BUS', 'TRAIN');

-- CreateEnum
CREATE TYPE "RouteProvider" AS ENUM ('HEURISTIC', 'MAPBOX');

-- CreateEnum
CREATE TYPE "CollaboratorRole" AS ENUM ('VIEWER', 'EDITOR');

-- CreateEnum
CREATE TYPE "BudgetCategory" AS ENUM ('ACCOMMODATION', 'INTERCITY_TRANSPORT', 'LOCAL_TRANSPORT', 'FOOD', 'ATTRACTION_ENTRY', 'ACTIVITIES', 'SHOPPING', 'MISC');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ReportKind" AS ENUM ('CLOSED', 'WRONG_INFO', 'DUPLICATE', 'INAPPROPRIATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'REVIEWED', 'CLOSED');

-- CreateTable
CREATE TABLE "states" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "StateKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" UUID NOT NULL,
    "stateId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL,
    "districtId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "CityKind" NOT NULL DEFAULT 'CITY',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "heroImageUrl" TEXT,
    "heroImageAttribution" TEXT,
    "isDestination" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" UUID NOT NULL,
    "cityId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "PlaceKind" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "typicalVisitMins" INTEGER,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "lastVerifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_category_map" (
    "placeId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "place_category_map_pkey" PRIMARY KEY ("placeId","categoryId")
);

-- CreateTable
CREATE TABLE "place_sources" (
    "id" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "provider" "DataProvider" NOT NULL,
    "externalId" TEXT NOT NULL,
    "licence" TEXT NOT NULL,
    "attribution" TEXT NOT NULL,
    "rawRef" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_images" (
    "id" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "attribution" TEXT,
    "licence" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_opening_hours" (
    "id" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "opensMin" INTEGER NOT NULL,
    "closesMin" INTEGER NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "source" "AmountSource" NOT NULL DEFAULT 'HEURISTIC_ESTIMATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_opening_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_prices" (
    "id" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "kind" "PriceKind" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "source" "AmountSource" NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "homeCity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "profileId" UUID NOT NULL,
    "travelStyle" "TravelStyle",
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "dietary" TEXT,
    "pacePreference" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'INR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("profileId")
);

-- CreateTable
CREATE TABLE "saved_places" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "destinationCityId" UUID NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "travellers" INTEGER NOT NULL DEFAULT 1,
    "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
    "travelStyle" "TravelStyle",
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "transportPref" "TransportPref",
    "accommodationPref" "AccommodationPref",
    "specialRequirements" TEXT,
    "activeVersionId" UUID,
    "shareSlug" TEXT,
    "shareEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_days" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "index" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_versions" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "label" TEXT,
    "createdBy" "VersionOrigin" NOT NULL,
    "generationParams" JSONB,
    "summary" TEXT,
    "isFeasible" BOOLEAN NOT NULL DEFAULT true,
    "infeasibilityReason" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_stops" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "tripDayId" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "arrivalMin" INTEGER NOT NULL,
    "departureMin" INTEGER NOT NULL,
    "visitDurationMins" INTEGER NOT NULL,
    "note" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_legs" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "fromStopId" UUID NOT NULL,
    "toStopId" UUID NOT NULL,
    "mode" "TravelMode" NOT NULL,
    "distanceMeters" INTEGER NOT NULL,
    "durationMins" INTEGER NOT NULL,
    "provider" "RouteProvider" NOT NULL,
    "polyline" TEXT,
    "estimatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_legs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_collaborators" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "roleInTrip" "CollaboratorRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_budgets" (
    "tripId" UUID NOT NULL,
    "totalPaise" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "categoryCapsPaise" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_budgets_pkey" PRIMARY KEY ("tripId")
);

-- CreateTable
CREATE TABLE "expense_estimates" (
    "id" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "tripDayId" UUID,
    "stopId" UUID,
    "category" "BudgetCategory" NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "source" "AmountSource" NOT NULL,
    "confidence" "Confidence" NOT NULL DEFAULT 'LOW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actual_expenses" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "tripDayId" UUID,
    "category" "BudgetCategory" NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "spentAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "enteredById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actual_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_reports" (
    "id" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "reporterId" UUID,
    "kind" "ReportKind" NOT NULL,
    "detail" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" UUID,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingestion_jobs" (
    "id" UUID NOT NULL,
    "provider" "DataProvider" NOT NULL,
    "regionRef" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "stats" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ingestion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_usage_logs" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "errorCode" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_logs" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "versionId" UUID,
    "stage" TEXT NOT NULL,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "durationMs" INTEGER NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "profileId" UUID,
    "email" TEXT,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "states_name_key" ON "states"("name");

-- CreateIndex
CREATE UNIQUE INDEX "states_slug_key" ON "states"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "states_code_key" ON "states"("code");

-- CreateIndex
CREATE UNIQUE INDEX "districts_stateId_slug_key" ON "districts"("stateId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");

-- CreateIndex
CREATE INDEX "cities_districtId_idx" ON "cities"("districtId");

-- CreateIndex
CREATE INDEX "cities_isDestination_idx" ON "cities"("isDestination");

-- CreateIndex
CREATE INDEX "places_cityId_isActive_idx" ON "places"("cityId", "isActive");

-- CreateIndex
CREATE INDEX "places_kind_idx" ON "places"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "places_cityId_slug_key" ON "places"("cityId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "place_categories_slug_key" ON "place_categories"("slug");

-- CreateIndex
CREATE INDEX "place_sources_placeId_idx" ON "place_sources"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "place_sources_provider_externalId_key" ON "place_sources"("provider", "externalId");

-- CreateIndex
CREATE INDEX "place_images_placeId_idx" ON "place_images"("placeId");

-- CreateIndex
CREATE INDEX "place_opening_hours_placeId_dayOfWeek_idx" ON "place_opening_hours"("placeId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "place_prices_placeId_kind_idx" ON "place_prices"("placeId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "saved_places_profileId_placeId_key" ON "saved_places"("profileId", "placeId");

-- CreateIndex
CREATE UNIQUE INDEX "trips_activeVersionId_key" ON "trips"("activeVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "trips_shareSlug_key" ON "trips"("shareSlug");

-- CreateIndex
CREATE INDEX "trips_ownerId_status_idx" ON "trips"("ownerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "trip_days_tripId_index_key" ON "trip_days"("tripId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_versions_tripId_versionNumber_key" ON "itinerary_versions"("tripId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_stops_versionId_tripDayId_orderIndex_key" ON "itinerary_stops"("versionId", "tripDayId", "orderIndex");

-- CreateIndex
CREATE INDEX "route_legs_versionId_idx" ON "route_legs"("versionId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_collaborators_tripId_profileId_key" ON "trip_collaborators"("tripId", "profileId");

-- CreateIndex
CREATE INDEX "expense_estimates_versionId_category_idx" ON "expense_estimates"("versionId", "category");

-- CreateIndex
CREATE INDEX "actual_expenses_tripId_spentAt_idx" ON "actual_expenses"("tripId", "spentAt");

-- CreateIndex
CREATE INDEX "place_reports_status_idx" ON "place_reports"("status");

-- CreateIndex
CREATE INDEX "ingestion_jobs_status_idx" ON "ingestion_jobs"("status");

-- CreateIndex
CREATE INDEX "provider_usage_logs_provider_createdAt_idx" ON "provider_usage_logs"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "generation_logs_tripId_idx" ON "generation_logs"("tripId");

-- CreateIndex
CREATE INDEX "feedback_status_idx" ON "feedback"("status");

-- AddForeignKey
ALTER TABLE "districts" ADD CONSTRAINT "districts_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "states"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_category_map" ADD CONSTRAINT "place_category_map_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_category_map" ADD CONSTRAINT "place_category_map_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "place_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_sources" ADD CONSTRAINT "place_sources_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_images" ADD CONSTRAINT "place_images_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_opening_hours" ADD CONSTRAINT "place_opening_hours_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_prices" ADD CONSTRAINT "place_prices_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_places" ADD CONSTRAINT "saved_places_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_places" ADD CONSTRAINT "saved_places_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_destinationCityId_fkey" FOREIGN KEY ("destinationCityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "itinerary_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_days" ADD CONSTRAINT "trip_days_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_versions" ADD CONSTRAINT "itinerary_versions_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_stops" ADD CONSTRAINT "itinerary_stops_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "itinerary_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_stops" ADD CONSTRAINT "itinerary_stops_tripDayId_fkey" FOREIGN KEY ("tripDayId") REFERENCES "trip_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_stops" ADD CONSTRAINT "itinerary_stops_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_legs" ADD CONSTRAINT "route_legs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "itinerary_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_legs" ADD CONSTRAINT "route_legs_fromStopId_fkey" FOREIGN KEY ("fromStopId") REFERENCES "itinerary_stops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_legs" ADD CONSTRAINT "route_legs_toStopId_fkey" FOREIGN KEY ("toStopId") REFERENCES "itinerary_stops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_collaborators" ADD CONSTRAINT "trip_collaborators_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_collaborators" ADD CONSTRAINT "trip_collaborators_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_budgets" ADD CONSTRAINT "trip_budgets_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_estimates" ADD CONSTRAINT "expense_estimates_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "itinerary_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_estimates" ADD CONSTRAINT "expense_estimates_tripDayId_fkey" FOREIGN KEY ("tripDayId") REFERENCES "trip_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_estimates" ADD CONSTRAINT "expense_estimates_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "itinerary_stops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actual_expenses" ADD CONSTRAINT "actual_expenses_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actual_expenses" ADD CONSTRAINT "actual_expenses_tripDayId_fkey" FOREIGN KEY ("tripDayId") REFERENCES "trip_days"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actual_expenses" ADD CONSTRAINT "actual_expenses_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_reports" ADD CONSTRAINT "place_reports_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_reports" ADD CONSTRAINT "place_reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_reports" ADD CONSTRAINT "place_reports_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_logs" ADD CONSTRAINT "generation_logs_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_logs" ADD CONSTRAINT "generation_logs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "itinerary_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
