import type { PlaceKind } from "@prisma/client";
import type { NormalizedPlace, PlaceProvider, RegionRef } from "./types";

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const RADIUS_M = 12_000;
const MAX_RESULTS = 60;

/** Maps OpenStreetMap tags onto our place kinds and interest categories. */
export function classifyOsmTags(tags: Record<string, string>): { kind: PlaceKind; categories: string[] } | null {
  const { tourism, historic, amenity, leisure, natural } = tags;
  if (tourism === "museum" || tourism === "gallery") return { kind: "MUSEUM", categories: ["museums", "history"] };
  if (tourism === "viewpoint") return { kind: "VIEWPOINT", categories: ["photography", "nature"] };
  if (amenity === "place_of_worship") return { kind: "RELIGIOUS_SITE", categories: historic ? ["religious", "history"] : ["religious"] };
  if (historic) return { kind: "ATTRACTION", categories: ["history", "photography"] };
  if (natural === "waterfall" || natural === "peak" || leisure === "nature_reserve" || leisure === "park") {
    return { kind: "NATURE", categories: ["nature"] };
  }
  if (amenity === "marketplace") return { kind: "SHOPPING", categories: ["shopping", "local-experiences"] };
  if (tourism === "attraction") return { kind: "ATTRACTION", categories: ["photography"] };
  return null;
}

export function normalizeOsmElement(el: OverpassElement): NormalizedPlace | null {
  const tags = el.tags ?? {};
  const name = (tags["name:en"] ?? tags.name ?? "").trim();
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  const cls = classifyOsmTags(tags);
  if (!name || lat === undefined || lng === undefined || !cls) return null;
  return {
    externalId: `${el.type}/${el.id}`,
    name,
    kind: cls.kind,
    lat,
    lng,
    categories: cls.categories,
    // OSM `description` is free text from contributors; kept as-is, never embellished.
    description: tags["description:en"] ?? tags.description ?? null,
    sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
  };
}

/**
 * OpenStreetMap via the public Overpass API. Data © OpenStreetMap
 * contributors, ODbL 1.0 — attribution is stored with every record and shown
 * on the site. Requests are small, infrequent and admin-triggered, in line
 * with the Overpass usage policy. Only well-identified features (those with a
 * Wikidata or Wikipedia link) are imported, to keep quality high.
 */
export class OsmOverpassProvider implements PlaceProvider {
  readonly id = "OSM" as const;
  readonly label = "OpenStreetMap (Overpass)";
  readonly licence = "ODbL 1.0";
  readonly attribution = "© OpenStreetMap contributors";

  constructor(private readonly endpoint = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter") {}

  async fetchPlaces(region: RegionRef): Promise<NormalizedPlace[]> {
    const around = `(around:${RADIUS_M},${region.lat},${region.lng})`;
    const notable = `["name"]["wikidata"]`;
    const query = `[out:json][timeout:25];
(
  nwr["tourism"~"^(attraction|museum|gallery|viewpoint)$"]${notable}${around};
  nwr["historic"]${notable}${around};
  nwr["amenity"="place_of_worship"]${notable}${around};
  nwr["amenity"="marketplace"]${notable}${around};
  nwr["natural"="waterfall"]${notable}${around};
);
out center ${MAX_RESULTS * 2};`;
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "place-import/1.0" },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(40_000),
    });
    if (!res.ok) throw new Error(`Overpass responded ${res.status}`);
    const body = (await res.json()) as { elements?: OverpassElement[] };
    const seen = new Set<string>();
    const out: NormalizedPlace[] = [];
    for (const el of body.elements ?? []) {
      const place = normalizeOsmElement(el);
      if (!place) continue;
      const key = place.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(place);
      if (out.length >= MAX_RESULTS) break;
    }
    return out;
  }
}
