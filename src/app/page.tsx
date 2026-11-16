import { PublicShell } from "@/components/layout/public-shell";
import { BudgetShowcase } from "@/components/marketing/budget-showcase";
import { EngineStory } from "@/components/marketing/engine-story";
import { FinalCta } from "@/components/marketing/final-cta";
import { DestinationGallery } from "@/components/marketing/gallery";
import { Hero } from "@/components/marketing/hero";
import { ItineraryDemo } from "@/components/marketing/itinerary-demo";
import { TravelStyles } from "@/components/marketing/travel-styles";
import { WorkspaceTeaser } from "@/components/marketing/workspace-teaser";
import { getCurrentUser } from "@/server/auth/session";
import { listDestinations } from "@/server/services/places";
import { samplePlans } from "@/server/services/samples";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [destinations, plans, user] = await Promise.all([
    listDestinations(),
    samplePlans(3),
    getCurrentUser().catch(() => null),
  ]);
  // Marketing imagery comes from whatever destinations exist — nothing is hardcoded.
  const hero = destinations.find((d) => d.slug === "kochi") ?? destinations[0];
  const closing = destinations.find((d) => d.slug !== hero?.slug && d.heroImageUrl) ?? hero;
  const placeCount = destinations.reduce((n, d) => n + d.placeCount, 0);

  return (
    <PublicShell overHero>
      <Hero
        image={hero?.heroImageUrl ?? "/images/destinations/kochi.jpg"}
        credit={hero?.heroImageAttribution ?? null}
        destinationCount={destinations.length}
        placeCount={placeCount}
      />
      <DestinationGallery
        items={destinations.map((d) => ({
          slug: d.slug, name: d.name, state: d.state, description: d.description,
          image: d.heroImageUrl, placeCount: d.placeCount,
        }))}
      />
      <EngineStory />
      <ItineraryDemo plans={plans} />
      <BudgetShowcase />
      <TravelStyles />
      <WorkspaceTeaser />
      <FinalCta image={closing?.heroImageUrl ?? null} signedIn={Boolean(user)} />
    </PublicShell>
  );
}
