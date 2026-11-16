import type { LatLng, RouteEstimate, TransportPref, TravelMode } from "./types";

const EARTH_RADIUS_M = 6_371_008.8;

/** Great-circle distance in metres. */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function centroid(points: LatLng[]): LatLng {
  if (points.length === 0) throw new Error("centroid of empty set");
  let lat = 0;
  let lng = 0;
  for (const p of points) {
    lat += p.lat;
    lng += p.lng;
  }
  return { lat: lat / points.length, lng: lng / points.length };
}

/**
 * Heuristic routing assumptions. These are planning estimates, not measured
 * routes — every leg produced from them is labelled provider = HEURISTIC.
 */
export const ROUTING_ASSUMPTIONS = {
  /** Roads are longer than straight lines. */
  windingFactor: 1.35,
  speedKmh: { WALK: 4.5, AUTO: 18, TAXI: 22, BUS: 14, TRAIN: 35 } as Record<TravelMode, number>,
  /** Fixed overhead per leg: hailing, parking, waiting. */
  overheadMins: { WALK: 0, AUTO: 5, TAXI: 5, BUS: 12, TRAIN: 20 } as Record<TravelMode, number>,
  walkMaxMeters: 1_000,
  walkMaxMetersWalkingFocused: 2_200,
};

export function chooseMode(roadMeters: number, pref: TransportPref | null): TravelMode {
  const a = ROUTING_ASSUMPTIONS;
  const walkLimit =
    pref === "WALKING_FOCUSED" ? a.walkMaxMetersWalkingFocused : a.walkMaxMeters;
  if (roadMeters <= walkLimit) return "WALK";
  switch (pref) {
    case "PUBLIC_TRANSPORT":
      return roadMeters > 4_000 ? "BUS" : "AUTO";
    case "CAR_WITH_DRIVER":
    case "SELF_DRIVE":
      return "TAXI";
    case "TWO_WHEELER":
      return "AUTO";
    case "WALKING_FOCUSED":
      return "AUTO";
    case "MIXED":
    default:
      return roadMeters > 8_000 ? "TAXI" : "AUTO";
  }
}

/** Deterministic travel estimate between two points. */
export function estimateRoute(
  from: LatLng,
  to: LatLng,
  pref: TransportPref | null,
): RouteEstimate {
  const a = ROUTING_ASSUMPTIONS;
  const roadMeters = Math.round(haversineMeters(from, to) * a.windingFactor);
  if (roadMeters === 0) return { mode: "WALK", distanceMeters: 0, durationMins: 0 };
  const mode = chooseMode(roadMeters, pref);
  const moving = (roadMeters / 1000 / a.speedKmh[mode]) * 60;
  return {
    mode,
    distanceMeters: roadMeters,
    durationMins: Math.max(1, Math.ceil(moving + a.overheadMins[mode])),
  };
}
