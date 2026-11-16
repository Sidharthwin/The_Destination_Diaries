-- Row Level Security policies (defense-in-depth for the Supabase client path;
-- the app's Prisma connection uses the service role and bypasses RLS).
-- Mirrored in supabase/rls/README.md for reference.

-- ── Helper: current auth uid (Supabase provides auth.uid()) ──
-- On a non-Supabase Postgres (e.g. local test DB) auth.uid() may not exist;
-- create a stub so these policies remain appliable.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE SCHEMA auth;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $f$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN') $$;

CREATE OR REPLACE FUNCTION public.can_access_trip(trip_uuid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$
  SELECT EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_uuid
      AND (t."ownerId" = auth.uid()
           OR EXISTS (SELECT 1 FROM trip_collaborators c
                      WHERE c."tripId" = t.id AND c."profileId" = auth.uid()))
  )
$$;

-- Shared trips are never listable: a caller must present the exact share slug.
CREATE OR REPLACE FUNCTION public.get_shared_trip(slug text) RETURNS SETOF trips
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT * FROM trips WHERE "shareSlug" = slug AND "shareEnabled" $$;

CREATE OR REPLACE FUNCTION public.can_edit_trip(trip_uuid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$
  SELECT EXISTS (
    SELECT 1 FROM trips t
    WHERE t.id = trip_uuid
      AND (t."ownerId" = auth.uid()
           OR EXISTS (SELECT 1 FROM trip_collaborators c
                      WHERE c."tripId" = t.id AND c."profileId" = auth.uid()
                        AND c."roleInTrip" = 'EDITOR'))
  )
$$;

-- ── Profiles ──
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY profiles_insert_own ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- ── User-owned simple tables ──
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_preferences_own ON user_preferences FOR ALL
  USING ("profileId" = auth.uid()) WITH CHECK ("profileId" = auth.uid());

ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_places_own ON saved_places FOR ALL
  USING ("profileId" = auth.uid()) WITH CHECK ("profileId" = auth.uid());

-- ── Trips and children ──
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY trips_select ON trips FOR SELECT USING (public.can_access_trip(id));
CREATE POLICY trips_insert ON trips FOR INSERT WITH CHECK ("ownerId" = auth.uid());
CREATE POLICY trips_update ON trips FOR UPDATE USING ("ownerId" = auth.uid());
CREATE POLICY trips_delete ON trips FOR DELETE USING ("ownerId" = auth.uid());

ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY trip_days_select ON trip_days FOR SELECT USING (public.can_access_trip("tripId"));
CREATE POLICY trip_days_write ON trip_days FOR ALL
  USING (public.can_edit_trip("tripId")) WITH CHECK (public.can_edit_trip("tripId"));

ALTER TABLE itinerary_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY itinerary_versions_select ON itinerary_versions FOR SELECT USING (public.can_access_trip("tripId"));
CREATE POLICY itinerary_versions_write ON itinerary_versions FOR ALL
  USING (public.can_edit_trip("tripId")) WITH CHECK (public.can_edit_trip("tripId"));

ALTER TABLE itinerary_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY itinerary_stops_select ON itinerary_stops FOR SELECT USING (
  EXISTS (SELECT 1 FROM itinerary_versions v WHERE v.id = "versionId" AND public.can_access_trip(v."tripId"))
);
CREATE POLICY itinerary_stops_write ON itinerary_stops FOR ALL USING (
  EXISTS (SELECT 1 FROM itinerary_versions v WHERE v.id = "versionId" AND public.can_edit_trip(v."tripId"))
) WITH CHECK (
  EXISTS (SELECT 1 FROM itinerary_versions v WHERE v.id = "versionId" AND public.can_edit_trip(v."tripId"))
);

ALTER TABLE route_legs ENABLE ROW LEVEL SECURITY;
CREATE POLICY route_legs_select ON route_legs FOR SELECT USING (
  EXISTS (SELECT 1 FROM itinerary_versions v WHERE v.id = "versionId" AND public.can_access_trip(v."tripId"))
);

ALTER TABLE trip_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY trip_collaborators_select ON trip_collaborators FOR SELECT
  USING ("profileId" = auth.uid() OR public.can_edit_trip("tripId"));
CREATE POLICY trip_collaborators_manage ON trip_collaborators FOR ALL
  USING (EXISTS (SELECT 1 FROM trips t WHERE t.id = "tripId" AND t."ownerId" = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM trips t WHERE t.id = "tripId" AND t."ownerId" = auth.uid()));

ALTER TABLE trip_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY trip_budgets_select ON trip_budgets FOR SELECT USING (public.can_access_trip("tripId"));
CREATE POLICY trip_budgets_write ON trip_budgets FOR ALL
  USING (public.can_edit_trip("tripId")) WITH CHECK (public.can_edit_trip("tripId"));

ALTER TABLE expense_estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY expense_estimates_select ON expense_estimates FOR SELECT USING (
  EXISTS (SELECT 1 FROM itinerary_versions v WHERE v.id = "versionId" AND public.can_access_trip(v."tripId"))
);

ALTER TABLE actual_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY actual_expenses_select ON actual_expenses FOR SELECT USING (public.can_access_trip("tripId"));
CREATE POLICY actual_expenses_write ON actual_expenses FOR ALL
  USING (public.can_edit_trip("tripId")) WITH CHECK (public.can_edit_trip("tripId") AND "enteredById" = auth.uid());

-- ── Geographic reference data: public read, admin write ──
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'states','districts','cities','places','place_categories',
    'place_category_map','place_sources','place_images',
    'place_opening_hours','place_prices'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I_public_read ON %I FOR SELECT USING (true)', t, t);
    EXECUTE format('CREATE POLICY %I_admin_write ON %I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', t, t);
  END LOOP;
END
$$;

-- ── Ops tables: admin only (reports/feedback insertable by users) ──
ALTER TABLE place_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY place_reports_insert ON place_reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND ("reporterId" IS NULL OR "reporterId" = auth.uid()));
CREATE POLICY place_reports_own_read ON place_reports FOR SELECT
  USING ("reporterId" = auth.uid() OR public.is_admin());
CREATE POLICY place_reports_admin_write ON place_reports FOR UPDATE USING (public.is_admin());

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY feedback_insert ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY feedback_admin ON feedback FOR SELECT USING (public.is_admin());
CREATE POLICY feedback_admin_update ON feedback FOR UPDATE USING (public.is_admin());

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ingestion_jobs','provider_usage_logs','generation_logs'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I_admin ON %I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', t, t);
  END LOOP;
END
$$;
