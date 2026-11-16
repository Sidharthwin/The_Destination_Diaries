import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { ServiceError, notFound } from "@/server/errors";
import { getPlaceProvider, type NormalizedPlace } from "@/server/providers/places";
import { logUsage } from "@/server/providers/routing";

/** Two records closer than this with similar names are treated as the same place. */
const DUPLICATE_RADIUS_M = 150;
const DUPLICATE_NAME_SIMILARITY = 0.45;

export function slugifyName(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function findDuplicate(cityId: string, p: NormalizedPlace): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id FROM places
    WHERE "cityId" = ${cityId}::uuid
      AND ST_DWithin(geom, ST_SetSRID(ST_MakePoint(${p.lng}, ${p.lat}), 4326)::geography, ${DUPLICATE_RADIUS_M})
      AND similarity(lower(name), lower(${p.name})) > ${DUPLICATE_NAME_SIMILARITY}
    LIMIT 1`);
  return rows[0]?.id ?? null;
}

/**
 * Import pipeline: fetch from a provider → normalize → de-duplicate → upsert,
 * recording provenance for every record and the outcome in an IngestionJob.
 * Imported places are always UNVERIFIED; existing places are never
 * overwritten with provider text if an admin has verified them.
 */
export async function runIngestion(providerId: string, cityId: string, existingJobId?: string) {
  const provider = getPlaceProvider(providerId);
  if (!provider) throw new ServiceError("VALIDATION", `Unknown provider "${providerId}"`);
  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city) throw notFound("City");

  const startedAt = new Date();
  const job = existingJobId
    ? await prisma.ingestionJob.update({
        where: { id: existingJobId },
        data: { status: "RUNNING", startedAt, finishedAt: null, error: null },
      })
    : await prisma.ingestionJob.create({
        data: { provider: provider.id, regionRef: `city:${city.slug}`, status: "RUNNING", startedAt },
      });

  const t0 = Date.now();
  try {
    const fetched = await provider.fetchPlaces({
      cityId: city.id, cityName: city.name, citySlug: city.slug, lat: city.lat, lng: city.lng,
    });
    await logUsage(`places:${provider.id}`, "fetchPlaces", "ok", t0);

    const categories = new Map((await prisma.placeCategory.findMany()).map((c) => [c.slug, c.id]));
    const stats = { fetched: fetched.length, created: 0, updated: 0, skipped: 0 };

    for (const p of fetched) {
      const known = await prisma.placeSource.findUnique({
        where: { provider_externalId: { provider: provider.id, externalId: p.externalId } },
        include: { place: true },
      });

      if (known) {
        // Refresh provenance; only touch facts on places nobody has verified.
        if (known.place.verificationStatus === "UNVERIFIED") {
          await prisma.place.update({
            where: { id: known.placeId },
            data: { lat: p.lat, lng: p.lng, kind: p.kind, description: known.place.description ?? p.description ?? null },
          });
        }
        await prisma.placeSource.update({ where: { id: known.id }, data: { fetchedAt: startedAt } });
        stats.updated++;
        continue;
      }

      const duplicateId = await findDuplicate(city.id, p);
      if (duplicateId) {
        // Same real-world place from another source: attach provenance, do not create a twin.
        await prisma.placeSource.create({
          data: {
            placeId: duplicateId, provider: provider.id, externalId: p.externalId,
            licence: provider.licence, attribution: provider.attribution, rawRef: p.sourceUrl ?? null, fetchedAt: startedAt,
          },
        });
        stats.skipped++;
        continue;
      }

      let slug = slugifyName(p.name) || `place-${p.externalId.replace(/[^a-z0-9]+/gi, "-")}`;
      if (await prisma.place.findUnique({ where: { cityId_slug: { cityId: city.id, slug } } })) {
        slug = `${slug}-${p.externalId.replace(/[^a-z0-9]+/gi, "-").slice(-12)}`;
      }
      await prisma.place.create({
        data: {
          cityId: city.id, name: p.name, slug, kind: p.kind, lat: p.lat, lng: p.lng,
          description: p.description ?? null, typicalVisitMins: p.typicalVisitMins ?? null,
          verificationStatus: "UNVERIFIED",
          categories: {
            create: p.categories.filter((c) => categories.has(c)).map((c) => ({ categoryId: categories.get(c)! })),
          },
          sources: {
            create: {
              provider: provider.id, externalId: p.externalId, licence: provider.licence,
              attribution: provider.attribution, rawRef: p.sourceUrl ?? null, fetchedAt: startedAt,
            },
          },
        },
      });
      stats.created++;
    }

    return prisma.ingestionJob.update({
      where: { id: job.id },
      data: { status: "SUCCEEDED", finishedAt: new Date(), stats },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await logUsage(`places:${provider.id}`, "fetchPlaces", "error", t0, message.slice(0, 60));
    return prisma.ingestionJob.update({
      where: { id: job.id },
      data: { status: "FAILED", finishedAt: new Date(), error: message.slice(0, 500) },
    });
  }
}

export async function retryIngestion(jobId: string) {
  const job = await prisma.ingestionJob.findUnique({ where: { id: jobId } });
  if (!job) throw notFound("Ingestion job");
  if (job.status !== "FAILED") throw new ServiceError("CONFLICT", "Only failed jobs can be retried");
  const slug = job.regionRef.startsWith("city:") ? job.regionRef.slice(5) : null;
  const city = slug ? await prisma.city.findUnique({ where: { slug } }) : null;
  if (!city) throw new ServiceError("CONFLICT", "This job's region can no longer be resolved");
  return runIngestion(job.provider, city.id, job.id);
}

/** Pairs of active places in the same city that are very close and similarly named. */
export async function findPossibleDuplicates(limit = 25) {
  return prisma.$queryRaw<
    { aId: string; aName: string; bId: string; bName: string; city: string; meters: number }[]
  >(Prisma.sql`
    SELECT a.id AS "aId", a.name AS "aName", b.id AS "bId", b.name AS "bName", c.name AS city,
           ROUND(ST_Distance(a.geom, b.geom))::int AS meters
    FROM places a
    JOIN places b ON a."cityId" = b."cityId" AND a.id < b.id
    JOIN cities c ON c.id = a."cityId"
    WHERE a."isActive" AND b."isActive"
      AND ST_DWithin(a.geom, b.geom, ${DUPLICATE_RADIUS_M})
      AND similarity(lower(a.name), lower(b.name)) > ${DUPLICATE_NAME_SIMILARITY}
    ORDER BY meters ASC
    LIMIT ${limit}`);
}
