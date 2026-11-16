-- PostGIS geometry columns, sync triggers, GIST indexes, and text-search
-- indexes. Requires the `postgis` extension (enable it in Supabase:
-- Dashboard → Database → Extensions). `pg_trgm` is enabled here directly.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Geography columns kept in sync with lat/lng via trigger ──

ALTER TABLE "cities" ADD COLUMN IF NOT EXISTS geom geography(Point, 4326);
ALTER TABLE "places" ADD COLUMN IF NOT EXISTS geom geography(Point, 4326);

CREATE OR REPLACE FUNCTION sync_point_geom() RETURNS trigger AS $$
BEGIN
  NEW.geom := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cities_sync_geom ON "cities";
CREATE TRIGGER cities_sync_geom
  BEFORE INSERT OR UPDATE OF lat, lng ON "cities"
  FOR EACH ROW EXECUTE FUNCTION sync_point_geom();

DROP TRIGGER IF EXISTS places_sync_geom ON "places";
CREATE TRIGGER places_sync_geom
  BEFORE INSERT OR UPDATE OF lat, lng ON "places"
  FOR EACH ROW EXECUTE FUNCTION sync_point_geom();

-- Backfill any pre-existing rows
UPDATE "cities" SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography WHERE geom IS NULL;
UPDATE "places" SET geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography WHERE geom IS NULL;

CREATE INDEX IF NOT EXISTS cities_geom_gist ON "cities" USING GIST (geom);
CREATE INDEX IF NOT EXISTS places_geom_gist ON "places" USING GIST (geom);

-- ── Trigram indexes for fuzzy name search ──

CREATE INDEX IF NOT EXISTS places_name_trgm ON "places" USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS cities_name_trgm ON "cities" USING GIN (name gin_trgm_ops);
