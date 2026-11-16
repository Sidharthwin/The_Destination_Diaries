import { DESTINATIONS, slugify } from "../../../../prisma/seed-data";
import type { NormalizedPlace, PlaceProvider, RegionRef } from "./types";

/** The hand-curated sample dataset, exposed through the same adapter interface. */
export class SampleDataProvider implements PlaceProvider {
  readonly id = "MANUAL" as const;
  readonly label = "Curated sample dataset";
  readonly licence = "Destination Diaries sample data (hand-curated, unverified)";
  readonly attribution = "Destination Diaries editorial sample";

  async fetchPlaces(region: RegionRef): Promise<NormalizedPlace[]> {
    const destination = DESTINATIONS.find((d) => slugify(d.city) === region.citySlug);
    if (!destination) return [];
    return destination.places.map((p) => ({
      externalId: `sample:${region.citySlug}:${slugify(p.name)}`,
      name: p.name,
      kind: p.kind,
      lat: p.lat,
      lng: p.lng,
      categories: p.categories,
      description: p.description,
      typicalVisitMins: p.visitMins,
      sourceUrl: "prisma/seed-data.ts",
    }));
  }
}
