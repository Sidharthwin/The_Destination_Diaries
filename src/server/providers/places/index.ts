import { OsmOverpassProvider } from "./osm";
import { SampleDataProvider } from "./sample";
import type { PlaceProvider } from "./types";

export type { NormalizedPlace, PlaceProvider, RegionRef } from "./types";

const registry: Record<string, () => PlaceProvider> = {
  MANUAL: () => new SampleDataProvider(),
  OSM: () => new OsmOverpassProvider(),
};

const overrides = new Map<string, PlaceProvider>();

export function setPlaceProviderForTests(id: string, provider: PlaceProvider | null) {
  if (provider) overrides.set(id, provider);
  else overrides.delete(id);
}

export function getPlaceProvider(id: string): PlaceProvider | null {
  return overrides.get(id) ?? registry[id]?.() ?? null;
}

export function listPlaceProviders(): PlaceProvider[] {
  return Object.keys(registry).map((id) => getPlaceProvider(id)!);
}
