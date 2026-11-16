import { ButtonLink } from "@/components/layout/button-link";
import { Reveal } from "@/components/motion/reveal";
import { DestinationSearch } from "@/components/places/destination-search";

export function PlanTeaser({ destinationCount, placeCount }: { destinationCount: number; placeCount: number }) {
  return (
    <section className="bg-forest py-24 text-cream">
      <div className="mx-auto grid max-w-7xl items-end gap-10 px-5 sm:px-8 lg:grid-cols-[1.1fr_1fr]">
        <Reveal>
          <p className="kicker text-terracotta before:bg-terracotta">Before the diary, the trip</p>
          <h2 className="mt-4 text-5xl leading-[1.02] sm:text-6xl">Plan the journey with an engine that does the <span className="italic text-sand">sums</span>.</h2>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-cream/75">
            Day-by-day itineraries worked out from real distances, time and budget — for {destinationCount} destinations
            and {placeCount} places so far. Below is a live example.
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <DestinationSearch />
          <div className="mt-5 flex flex-wrap gap-5 text-sm">
            <ButtonLink href="/plan" variant="light" size="sm">How planning works</ButtonLink>
            <ButtonLink href="/trips/new" variant="quiet" size="sm" className="px-0 text-cream">Plan a trip now</ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
