import type { DataProvider, PlaceKind } from "@prisma/client";

/** A place as supplied by any source, normalized to our vocabulary. */
export interface NormalizedPlace {
  externalId: string;
  name: string;
  kind: PlaceKind;
  lat: number;
  lng: number;
  /** Interest category slugs (see PlaceCategory). */
  categories: string[];
  description?: string | null;
  typicalVisitMins?: number | null;
  /** Where a human can inspect the source record. */
  sourceUrl?: string | null;
}

export interface RegionRef {
  cityId: string;
  cityName: string;
  citySlug: string;
  lat: number;
  lng: number;
}

/**
 * Provider-independent place discovery. Core services never talk to a data
 * source directly: add a source by implementing this interface.
 */
export interface PlaceProvider {
  readonly id: DataProvider;
  readonly label: string;
  /** Licence the data is used under, stored with every imported record. */
  readonly licence: string;
  readonly attribution: string;
  fetchPlaces(region: RegionRef): Promise<NormalizedPlace[]>;
}
