import { Prisma } from "@prisma/client";
import type { NearbyQuery, PlaceSearchQuery } from "@/lib/validation/places";
import { prisma } from "@/server/db/prisma";
import { notFound } from "@/server/errors";
import type { CandidatePlace } from "@/server/services/optimizer/types";

const placeCardInclude = {
  city: { include: { district: { include: { state: true } } } },
  categories: { include: { category: true } },
  images: { where: { isPrimary: true }, take: 1 },
} satisfies Prisma.PlaceInclude;

type PlaceCardRow = Prisma.PlaceGetPayload<{ include: typeof placeCardInclude }>;

export interface PlaceCard {
  id: string;
  name: string;
  slug: string;
  kind: string;
  lat: number;
  lng: number;
  description: string | null;
  typicalVisitMins: number | null;
  verificationStatus: string;
  categories: { slug: string; name: string }[];
  city: { id: string; name: string; slug: string; state: string };
  imageUrl: string | null;
  distanceMeters?: number;
}

function toCard(p: PlaceCardRow, distanceMeters?: number): PlaceCard {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    kind: p.kind,
    lat: p.lat,
    lng: p.lng,
    description: p.description,
    typicalVisitMins: p.typicalVisitMins,
    verificationStatus: p.verificationStatus,
    categories: p.categories.map((c) => ({ slug: c.category.slug, name: c.category.name })),
    city: {
      id: p.city.id,
      name: p.city.name,
      slug: p.city.slug,
      state: p.city.district.state.name,
    },
    imageUrl: p.images[0]?.url ?? null,
    ...(distanceMeters !== undefined ? { distanceMeters } : {}),
  };
}

/**
 * Text + filter search across every city in the database. Uses trigram
 * similarity so small typos still match ("hawa mehal" → Hawa Mahal).
 */
export async function searchPlaces(query: PlaceSearchQuery) {
  const conditions: Prisma.Sql[] = [Prisma.sql`p."isActive" = true`];
  if (query.q) {
    const like = `%${query.q}%`;
    conditions.push(
      Prisma.sql`(p.name ILIKE ${like} OR c.name ILIKE ${like} OR similarity(p.name, ${query.q}) > 0.3)`,
    );
  }
  if (query.city) conditions.push(Prisma.sql`c.slug = ${query.city}`);
  if (query.state) conditions.push(Prisma.sql`s.slug = ${query.state}`);
  if (query.kind) conditions.push(Prisma.sql`p.kind = ${query.kind}::"PlaceKind"`);
  if (query.category) {
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM place_category_map m JOIN place_categories pc ON pc.id = m."categoryId"
      WHERE m."placeId" = p.id AND pc.slug = ${query.category})`);
  }
  const where = Prisma.join(conditions, " AND ");
  const rank = query.q
    ? Prisma.sql`GREATEST(similarity(p.name, ${query.q}), CASE WHEN p.name ILIKE ${`${query.q}%`} THEN 1 ELSE 0 END) DESC,`
    : Prisma.empty;

  const from = Prisma.sql`
    FROM places p
    JOIN cities c ON c.id = p."cityId"
    JOIN districts d ON d.id = c."districtId"
    JOIN states s ON s.id = d."stateId"
    WHERE ${where}`;

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT p.id ${from} ORDER BY ${rank} p.name ASC LIMIT ${query.limit} OFFSET ${query.offset}`,
    ),
    prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`SELECT COUNT(*)::bigint AS count ${from}`),
  ]);

  const ids = rows.map((r) => r.id);
  const places = await prisma.place.findMany({ where: { id: { in: ids } }, include: placeCardInclude });
  const byId = new Map(places.map((p) => [p.id, p]));

  const cities = query.q
    ? await prisma.city.findMany({
        where: { name: { contains: query.q, mode: "insensitive" } },
        include: { district: { include: { state: true } } },
        take: 5,
      })
    : [];

  return {
    places: ids.map((id) => toCard(byId.get(id)!)),
    cities: cities.map((c) => ({
      id: c.id, name: c.name, slug: c.slug, kind: c.kind, state: c.district.state.name, lat: c.lat, lng: c.lng,
    })),
    total: Number(countRows[0]?.count ?? 0),
    limit: query.limit,
    offset: query.offset,
  };
}

/** PostGIS radius search, nearest first. */
export async function nearbyPlaces(query: NearbyQuery, opts?: { excludeIds?: string[] }) {
  const point = Prisma.sql`ST_SetSRID(ST_MakePoint(${query.lng}, ${query.lat}), 4326)::geography`;
  const kind = query.kind ? Prisma.sql`AND p.kind = ${query.kind}::"PlaceKind"` : Prisma.empty;
  const rows = await prisma.$queryRaw<{ id: string; distance: number }[]>(Prisma.sql`
    SELECT p.id, ST_Distance(p.geom, ${point}) AS distance
    FROM places p
    WHERE p."isActive" = true
      AND ST_DWithin(p.geom, ${point}, ${query.radiusKm * 1000})
      ${kind}
    ORDER BY distance ASC
    LIMIT ${query.limit + (opts?.excludeIds?.length ?? 0)}`);

  const excluded = new Set(opts?.excludeIds ?? []);
  const kept = rows.filter((r) => !excluded.has(r.id)).slice(0, query.limit);
  const places = await prisma.place.findMany({
    where: { id: { in: kept.map((r) => r.id) } },
    include: placeCardInclude,
  });
  const byId = new Map(places.map((p) => [p.id, p]));
  return kept.map((r) => toCard(byId.get(r.id)!, Math.round(r.distance)));
}

export async function getPlace(id: string) {
  const place = await prisma.place.findUnique({
    where: { id },
    include: {
      city: { include: { district: { include: { state: true } } } },
      categories: { include: { category: true } },
      images: true,
      sources: true,
      openingHours: { orderBy: [{ dayOfWeek: "asc" }, { opensMin: "asc" }] },
      prices: true,
    },
  });
  if (!place || !place.isActive) throw notFound("Place");
  return {
    id: place.id,
    name: place.name,
    slug: place.slug,
    kind: place.kind,
    lat: place.lat,
    lng: place.lng,
    description: place.description,
    typicalVisitMins: place.typicalVisitMins,
    verificationStatus: place.verificationStatus,
    lastVerifiedAt: place.lastVerifiedAt,
    city: {
      id: place.city.id, name: place.city.name, slug: place.city.slug,
      district: place.city.district.name, state: place.city.district.state.name,
    },
    categories: place.categories.map((c) => ({ slug: c.category.slug, name: c.category.name })),
    images: place.images.map((i) => ({ url: i.url, attribution: i.attribution, licence: i.licence, isPrimary: i.isPrimary })),
    // Empty arrays mean "unknown", never "closed" or "free".
    openingHours: place.openingHours.map((h) => ({
      dayOfWeek: h.dayOfWeek, opensMin: h.opensMin, closesMin: h.closesMin, source: h.source,
    })),
    prices: place.prices.map((p) => ({
      kind: p.kind, amountPaise: p.amountPaise, currency: p.currency, source: p.source,
      verifiedAt: p.verifiedAt, notes: p.notes,
    })),
    sources: place.sources.map((s) => ({
      provider: s.provider, licence: s.licence, attribution: s.attribution, fetchedAt: s.fetchedAt,
    })),
  };
}

export async function listDestinations() {
  const cities = await prisma.city.findMany({
    where: { isDestination: true },
    include: {
      district: { include: { state: true } },
      _count: { select: { places: { where: { isActive: true } } } },
    },
    orderBy: { name: "asc" },
  });
  return cities.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    kind: c.kind,
    state: c.district.state.name,
    stateSlug: c.district.state.slug,
    description: c.description,
    heroImageUrl: c.heroImageUrl,
    heroImageAttribution: c.heroImageAttribution,
    lat: c.lat,
    lng: c.lng,
    placeCount: c._count.places,
  }));
}

export type DestinationSummary = Awaited<ReturnType<typeof listDestinations>>[number];

export async function getDestination(slug: string) {
  const city = await prisma.city.findUnique({
    where: { slug },
    include: { district: { include: { state: true } } },
  });
  if (!city) throw notFound("Destination");
  const places = await prisma.place.findMany({
    where: { cityId: city.id, isActive: true },
    include: placeCardInclude,
    orderBy: { name: "asc" },
  });
  return {
    id: city.id,
    name: city.name,
    slug: city.slug,
    kind: city.kind,
    district: city.district.name,
    state: city.district.state.name,
    description: city.description,
    heroImageUrl: city.heroImageUrl,
    heroImageAttribution: city.heroImageAttribution,
    lat: city.lat,
    lng: city.lng,
    places: places.map((p) => toCard(p)),
  };
}

/** Radius around a destination used to gather itinerary candidates. */
const CANDIDATE_RADIUS_KM = 40;

/**
 * Candidate places for the planner: everything active within a radius of the
 * destination — works identically for any city in the database.
 */
export async function candidatesForCity(cityId: string): Promise<{
  candidates: CandidatePlace[];
  center: { lat: number; lng: number };
}> {
  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city) throw notFound("Destination");
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT p.id FROM places p
    WHERE p."isActive" = true
      AND ST_DWithin(
        p.geom,
        ST_SetSRID(ST_MakePoint(${city.lng}, ${city.lat}), 4326)::geography,
        ${CANDIDATE_RADIUS_KM * 1000})`);
  const places = await prisma.place.findMany({
    where: { id: { in: rows.map((r) => r.id) } },
    include: { categories: { include: { category: true } }, openingHours: true },
  });
  return {
    center: { lat: city.lat, lng: city.lng },
    candidates: places.map((p) => ({
      id: p.id,
      name: p.name,
      kind: p.kind,
      lat: p.lat,
      lng: p.lng,
      categories: p.categories.map((c) => c.category.slug),
      typicalVisitMins: p.typicalVisitMins,
      openingHours: p.openingHours.map((h) => ({
        dayOfWeek: h.dayOfWeek, opensMin: h.opensMin, closesMin: h.closesMin,
      })),
      verified: p.verificationStatus === "VERIFIED",
    })),
  };
}
