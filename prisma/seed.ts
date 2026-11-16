import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { CATEGORIES, DESTINATIONS, STATES, slugify } from "./seed-data";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

const SAMPLE_LICENCE = "Destination Diaries sample data (hand-curated, unverified)";
const SAMPLE_ATTRIBUTION = "Destination Diaries editorial sample";

async function main() {
  const startedAt = new Date();
  const job = await prisma.ingestionJob.create({
    data: { provider: "MANUAL", regionRef: "seed:sample-dataset", status: "RUNNING", startedAt },
  });

  let created = 0;
  let updated = 0;

  for (const s of STATES) {
    await prisma.state.upsert({
      where: { code: s.code },
      update: { name: s.name, kind: s.kind },
      create: { name: s.name, slug: slugify(s.name), code: s.code, kind: s.kind },
    });
  }

  const categoryIds = new Map<string, string>();
  for (const c of CATEGORIES) {
    const row = await prisma.placeCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: c,
    });
    categoryIds.set(c.slug, row.id);
  }

  for (const d of DESTINATIONS) {
    const state = await prisma.state.findUniqueOrThrow({ where: { code: d.stateCode } });
    const district = await prisma.district.upsert({
      where: { stateId_slug: { stateId: state.id, slug: slugify(d.district) } },
      update: {},
      create: { stateId: state.id, name: d.district, slug: slugify(d.district) },
    });
    const city = await prisma.city.upsert({
      where: { slug: slugify(d.city) },
      update: {
        description: d.description,
        lat: d.lat,
        lng: d.lng,
        heroImageUrl: d.heroImageUrl ?? `/images/destinations/${slugify(d.city)}.jpg`,
      },
      create: {
        districtId: district.id,
        name: d.city,
        slug: slugify(d.city),
        kind: d.cityKind,
        lat: d.lat,
        lng: d.lng,
        description: d.description,
        heroImageUrl: d.heroImageUrl ?? `/images/destinations/${slugify(d.city)}.jpg`,
        isDestination: true,
      },
    });

    for (const p of d.places) {
      const slug = slugify(p.name);
      const existing = await prisma.place.findUnique({
        where: { cityId_slug: { cityId: city.id, slug } },
      });
      const data = {
        name: p.name,
        kind: p.kind,
        lat: p.lat,
        lng: p.lng,
        description: p.description,
        typicalVisitMins: p.visitMins,
      };
      const place = existing
        ? await prisma.place.update({ where: { id: existing.id }, data })
        : await prisma.place.create({ data: { ...data, cityId: city.id, slug } });
      if (existing) updated++;
      else created++;

      await prisma.placeCategoryMap.deleteMany({ where: { placeId: place.id } });
      await prisma.placeCategoryMap.createMany({
        data: p.categories.map((c) => ({ placeId: place.id, categoryId: categoryIds.get(c)! })),
      });

      await prisma.placeSource.upsert({
        where: {
          provider_externalId: { provider: "MANUAL", externalId: `sample:${city.slug}:${slug}` },
        },
        update: { fetchedAt: startedAt },
        create: {
          placeId: place.id,
          provider: "MANUAL",
          externalId: `sample:${city.slug}:${slug}`,
          licence: SAMPLE_LICENCE,
          attribution: SAMPLE_ATTRIBUTION,
          rawRef: "prisma/seed-data.ts",
          fetchedAt: startedAt,
        },
      });
    }
  }

  await prisma.ingestionJob.update({
    where: { id: job.id },
    data: {
      status: "SUCCEEDED",
      finishedAt: new Date(),
      stats: { fetched: created + updated, created, updated, skipped: 0 },
    },
  });

  console.log(
    `Seeded ${STATES.length} states/UTs, ${DESTINATIONS.length} destinations, ${created} new + ${updated} updated places (all UNVERIFIED sample data).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
