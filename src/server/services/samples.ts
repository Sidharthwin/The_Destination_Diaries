import { planItinerary } from "@/server/services/optimizer/planner";
import { candidatesForCity, listDestinations } from "@/server/services/places";

export interface SamplePlan {
  slug: string;
  name: string;
  state: string;
  days: {
    index: number;
    travelMins: number;
    stops: {
      id: string;
      name: string;
      kind: string;
      lat: number;
      lng: number;
      arrivalMin: number;
      visitDurationMins: number;
      legMins: number | null;
      legMode: string | null;
    }[];
  }[];
}

/**
 * Live sample itineraries for the marketing pages. These are produced by the
 * real planning engine from the places in the database — not mock-ups.
 */
export async function samplePlans(limit = 3): Promise<SamplePlan[]> {
  const destinations = (await listDestinations()).filter((d) => d.placeCount >= 6).slice(0, limit);
  // A fixed, illustrative weekend so the sample is stable between requests.
  const days = [
    { index: 0, date: "2027-01-09" },
    { index: 1, date: "2027-01-10" },
  ];
  return Promise.all(
    destinations.map(async (d) => {
      const { candidates, center } = await candidatesForCity(d.id);
      const byId = new Map(candidates.map((c) => [c.id, c]));
      const plan = planItinerary({
        center,
        days,
        candidates,
        interests: ["history", "photography", "local-experiences"],
        travelStyle: "CULTURAL",
        transportPref: "MIXED",
      });
      return {
        slug: d.slug,
        name: d.name,
        state: d.state,
        days: plan.days.map((day) => ({
          index: day.dayIndex,
          travelMins: day.totalTravelMins,
          stops: day.stops.map((s, i) => {
            const p = byId.get(s.placeId)!;
            const leg = day.legs[i];
            return {
              id: p.id,
              name: p.name,
              kind: p.kind,
              lat: p.lat,
              lng: p.lng,
              arrivalMin: s.arrivalMin,
              visitDurationMins: s.visitDurationMins,
              legMins: leg?.durationMins ?? null,
              legMode: leg?.mode ?? null,
            };
          }),
        })),
      };
    }),
  );
}
