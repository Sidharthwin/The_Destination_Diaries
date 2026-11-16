import type { Metadata } from "next";
import { ButtonLink } from "@/components/layout/button-link";
import { BudgetShowcase } from "@/components/marketing/budget-showcase";
import { EngineStory } from "@/components/marketing/engine-story";
import { ItineraryDemo } from "@/components/marketing/itinerary-demo";
import { TravelStyles } from "@/components/marketing/travel-styles";
import { WorkspaceTeaser } from "@/components/marketing/workspace-teaser";
import { DestinationSearch } from "@/components/places/destination-search";
import { PLAN_TAGLINE } from "@/lib/constants/travel";
import { listDestinations } from "@/server/services/places";
import { samplePlans } from "@/server/services/samples";

export const metadata: Metadata = {
  title: "Plan a trip",
  description: "Day-wise itineraries across India built by an optimization engine: real travel times, honest budgets, and plans you can edit and replan.",
};

export default async function PlanPage() {
  const [destinations, plans] = await Promise.all([listDestinations(), samplePlans(3)]);
  const places = destinations.reduce((n, d) => n + d.placeCount, 0);
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-16 sm:px-8 sm:pt-24">
          <p className="kicker">Plan a trip</p>
          <h1 className="mt-4 max-w-5xl text-6xl leading-[0.98] sm:text-8xl">{PLAN_TAGLINE.replace("intelligently planned.", "")}<span className="italic text-terracotta-deep">intelligently planned.</span></h1>
          <div className="mt-10 grid items-end gap-8 lg:grid-cols-[1.2fr_1fr]">
            <DestinationSearch tone="dark" />
            <p className="max-w-md leading-relaxed text-ink-soft lg:justify-self-end">
              Itineraries built by a planning engine that understands distance, time and budget — then explained in plain language.
              Covering {destinations.length} destinations and {places} places, with more being added.
            </p>
          </div>
          <ButtonLink href="/trips/new" size="lg" className="mt-8">Plan a trip</ButtonLink>
        </div>
      </header>
      <EngineStory />
      <ItineraryDemo plans={plans} />
      <BudgetShowcase />
      <TravelStyles />
      <WorkspaceTeaser />
    </>
  );
}
