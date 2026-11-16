import { prisma } from "@/server/db/prisma";
import type { LatLng, RouteEstimate, TravelMode } from "@/server/services/optimizer/types";

export interface MeasuredLeg extends RouteEstimate {
  provider: "MAPBOX";
}

export interface RoutingProvider {
  readonly name: string;
  /** Measured route for one leg, or null when the provider cannot answer. */
  measure(from: LatLng, to: LatLng, mode: TravelMode): Promise<MeasuredLeg | null>;
}

const MAPBOX_PROFILE: Partial<Record<TravelMode, string>> = {
  WALK: "walking",
  AUTO: "driving",
  TAXI: "driving",
};

/**
 * Mapbox Directions adapter (server-side secret token). Bus and train legs
 * are not measured — Mapbox has no Indian transit routing — so they stay on
 * the labelled heuristic.
 */
export class MapboxDirectionsProvider implements RoutingProvider {
  readonly name = "mapbox-directions";
  constructor(private readonly token: string) {}

  async measure(from: LatLng, to: LatLng, mode: TravelMode): Promise<MeasuredLeg | null> {
    const profile = MAPBOX_PROFILE[mode];
    if (!profile) return null;
    const started = Date.now();
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/` +
      `${from.lng},${from.lat};${to.lng},${to.lat}?overview=false&access_token=${this.token}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) {
        await logUsage(this.name, "directions", res.status === 429 ? "rate_limited" : "error", started, String(res.status));
        return null;
      }
      const body = (await res.json()) as { routes?: { distance: number; duration: number }[] };
      const route = body.routes?.[0];
      if (!route) {
        await logUsage(this.name, "directions", "error", started, "NO_ROUTE");
        return null;
      }
      await logUsage(this.name, "directions", "ok", started);
      return {
        mode,
        distanceMeters: Math.round(route.distance),
        durationMins: Math.max(1, Math.ceil(route.duration / 60)),
        provider: "MAPBOX",
      };
    } catch (err) {
      await logUsage(this.name, "directions", "error", started, err instanceof Error ? err.name : "UNKNOWN");
      return null;
    }
  }
}

let override: RoutingProvider | null | undefined;

export function setRoutingProviderForTests(provider: RoutingProvider | null | undefined) {
  override = provider;
}

/** Null means "use the built-in heuristic" — the tested default. */
export function getRoutingProvider(): RoutingProvider | null {
  if (override !== undefined) return override;
  const token = process.env.MAPBOX_SECRET_TOKEN;
  return token ? new MapboxDirectionsProvider(token) : null;
}

export async function logUsage(
  provider: string,
  operation: string,
  status: "ok" | "error" | "rate_limited",
  startedAt: number,
  errorCode?: string,
) {
  try {
    await prisma.providerUsageLog.create({
      data: { provider, operation, status, latencyMs: Date.now() - startedAt, errorCode },
    });
  } catch {
    // Usage logging must never break a request.
  }
}
