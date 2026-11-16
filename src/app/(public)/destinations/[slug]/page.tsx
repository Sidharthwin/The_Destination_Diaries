import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/layout/button-link";
import { PlaceCard } from "@/components/places/place-card";
import { KIND_LABELS } from "@/lib/utils/format";
import { getCurrentUser } from "@/server/auth/session";
import { ServiceError } from "@/server/errors";
import { getDestination } from "@/server/services/places";
import { savedPlaceIds } from "@/server/services/saved";
import { DestinationMap } from "./destination-map";

async function load(slug: string) {
  try {
    return await getDestination(slug);
  } catch (err) {
    if (err instanceof ServiceError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
}

export async function generateMetadata({ params }: PageProps<"/destinations/[slug]">): Promise<Metadata> {
  const d = await load((await params).slug);
  return { title: `${d.name}, ${d.state}`, description: d.description ?? undefined };
}

const KIND_ORDER = ["ATTRACTION", "VIEWPOINT", "MUSEUM", "RELIGIOUS_SITE", "NATURE", "ACTIVITY", "SHOPPING", "RESTAURANT", "OTHER"];
const KIND_HEADINGS: Record<string, string> = {
  ATTRACTION: "Landmarks", VIEWPOINT: "Viewpoints", MUSEUM: "Museums", RELIGIOUS_SITE: "Sacred sites",
  NATURE: "Nature", ACTIVITY: "Experiences", SHOPPING: "Markets", RESTAURANT: "Food", OTHER: "More",
};

export default async function DestinationPage({ params }: PageProps<"/destinations/[slug]">) {
  const d = await load((await params).slug);
  const user = await getCurrentUser();
  const saved = await savedPlaceIds(user?.id);
  const groups = KIND_ORDER.map((k) => ({ kind: k, places: d.places.filter((p) => p.kind === k) })).filter((g) => g.places.length > 0);

  return (
    <>
      <section className="relative isolate flex min-h-[70svh] items-end overflow-hidden bg-forest text-cream">
        {d.heroImageUrl && <Image src={d.heroImageUrl} alt="" fill priority sizes="100vw" className="-z-10 object-cover" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#0d1f1a]/90 via-[#0d1f1a]/20 to-transparent" />
        <div className="mx-auto w-full max-w-7xl px-5 pb-12 pt-40 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-sand">{d.district} district · {d.state}</p>
          <h1 className="mt-3 text-[clamp(3.5rem,12vw,9rem)] leading-[0.9]">{d.name}</h1>
          <div className="mt-8 grid items-end gap-8 lg:grid-cols-[1.3fr_1fr]">
            <p className="max-w-2xl text-lg leading-relaxed text-cream/90">{d.description}</p>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <ButtonLink href={`/trips/new?destination=${d.slug}`} variant="accent" size="lg">Plan a trip to {d.name}</ButtonLink>
            </div>
          </div>
        </div>
        {d.heroImageAttribution && <p className="absolute right-3 top-3 max-w-xs text-right text-[10px] leading-tight text-cream/60">Photo: {d.heroImageAttribution}</p>}
      </section>

      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div>
          <p className="eyebrow">{d.places.length} places to plan with</p>
          <h2 className="mt-3 text-4xl sm:text-5xl">What is here</h2>
          <nav aria-label="Jump to section" className="mt-6 flex flex-wrap gap-2">
            {groups.map((g) => (
              <a key={g.kind} href={`#kind-${g.kind}`} className="inline-flex h-9 items-center rounded-full border border-border px-4 text-xs font-semibold hover:border-forest">
                {KIND_HEADINGS[g.kind] ?? KIND_LABELS[g.kind]} · {g.places.length}
              </a>
            ))}
          </nav>
          {groups.map((g) => (
            <section key={g.kind} id={`kind-${g.kind}`} className="mt-12 scroll-mt-28">
              <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.22em] text-ink-soft">{KIND_HEADINGS[g.kind]}</h3>
              <div className="mt-3 grid gap-x-10 sm:grid-cols-2">
                {g.places.map((p) => <PlaceCard key={p.id} place={p} saved={saved.has(p.id)} canSave={Boolean(user)} />)}
              </div>
            </section>
          ))}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="h-[26rem] overflow-hidden border border-border">
            <DestinationMap points={d.places.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, label: p.name }))} />
          </div>
          <div className="mt-6 border border-border bg-paper p-6 text-sm leading-relaxed text-ink-soft">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-ink">About this data</h2>
            <p className="mt-3">
              Places here come from our hand-curated sample dataset. Locations are approximate and
              listings are unverified until checked. We do not show prices, ratings or opening hours
              unless we have a reliable source for them.
            </p>
            <p className="mt-3">Spotted a mistake? <a href="/contact" className="font-semibold text-forest underline underline-offset-2">Tell us</a>.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
