import { PublicShell } from "@/components/layout/public-shell";
import { DestinationGallery } from "@/components/marketing/gallery";
import { Hero } from "@/components/marketing/hero";
import { ItineraryDemo } from "@/components/marketing/itinerary-demo";
import { LooseToChapters } from "@/components/marketing/loose-to-chapters";
import { PlanTeaser } from "@/components/marketing/plan-teaser";
import { ScrollBook } from "@/components/marketing/scroll-book";
import { TemplateSwitcher } from "@/components/marketing/template-switcher";
import { UntilNextTime } from "@/components/marketing/until-next-time";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { SAMPLE_DIARIES, SAMPLE_PHOTOS as P } from "@/lib/diary/samples";
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
  const hero = destinations.find((d) => d.slug === "kochi") ?? destinations[0];
  const closing = destinations.find((d) => d.slug === "darjeeling") ?? hero;
  const placeCount = destinations.reduce((n, d) => n + d.placeCount, 0);
  const [jaipur] = SAMPLE_DIARIES;
  const signedIn = Boolean(user);

  return (
    <PublicShell overHero>
      <ScrollProgress />
      <Hero image={hero?.heroImageUrl ?? "/images/destinations/kochi.jpg"} credit={hero?.heroImageAttribution ?? null} signedIn={signedIn} />
      <ScrollBook diary={jaipur} />
      <LooseToChapters
        chapters={["The fort before the crowds", "A wall made of windows", "The city, all at once"]}
        items={[
          { photo: P.amer, note: "two forts — one of water", chapter: 0 },
          { photo: P.hawa, note: "lost count at forty", chapter: 1 },
          { photo: P.nahargarh, note: "pink, then gold", chapter: 2 },
          { photo: P.palace, note: "that gate!", chapter: 0 },
          { photo: P.bazaar, note: "postcard, ₹10", chapter: 1 },
        ]}
      />
      <TemplateSwitcher diary={jaipur} />
      <DestinationGallery
        items={destinations.map((d) => ({
          slug: d.slug, name: d.name, state: d.state, description: d.description,
          image: d.heroImageUrl, placeCount: d.placeCount,
        }))}
      />
      <PlanTeaser destinationCount={destinations.length} placeCount={placeCount} />
      <ItineraryDemo plans={plans} />
      <UntilNextTime image={closing?.heroImageUrl ?? null} signedIn={signedIn} />
    </PublicShell>
  );
}
