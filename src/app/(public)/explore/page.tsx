import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { DestinationSearch } from "@/components/places/destination-search";
import { PlaceCard } from "@/components/places/place-card";
import { INTERESTS } from "@/lib/constants/travel";
import { KIND_LABELS } from "@/lib/utils/format";
import { placeSearchQuerySchema } from "@/lib/validation/places";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";
import { listDestinations, searchPlaces } from "@/server/services/places";
import { savedPlaceIds } from "@/server/services/saved";

export const metadata: Metadata = {
  title: "Explore",
  description: "Search destinations, attractions, markets and experiences across India.",
};

const PAGE = 18;

export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const raw = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const parsed = placeSearchQuerySchema.safeParse({
    q: first(raw.q), city: first(raw.city), kind: first(raw.kind), category: first(raw.category),
    limit: PAGE, offset: first(raw.offset) ?? 0,
  });
  const query = parsed.success ? parsed.data : placeSearchQuerySchema.parse({ limit: PAGE });
  const filtering = Boolean(query.q || query.city || query.kind || query.category);

  const [destinations, user, results] = await Promise.all([
    listDestinations(),
    getCurrentUser(),
    filtering ? searchPlaces(query) : Promise.resolve(null),
  ]);
  const saved = await savedPlaceIds(user?.id);

  const href = (patch: Record<string, string | undefined>) => {
    const next = { q: query.q, city: query.city, kind: query.kind, category: query.category, ...patch };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `/explore?${s}` : "/explore";
  };
  const chip = (active: boolean) =>
    cn("inline-flex h-9 items-center rounded-full border px-4 text-xs font-semibold transition-colors",
      active ? "border-forest bg-forest text-cream" : "border-border hover:border-forest");

  return (
    <>
      <PageHeader
        eyebrow="Explore"
        title={<>Find a place worth the <span className="italic">journey</span></>}
        intro={`We currently cover ${destinations.length} destinations and ${destinations.reduce((n, d) => n + d.placeCount, 0)} places — a representative start, growing as verified data is added. Listings are marked unverified until checked.`}
      />
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <DestinationSearch tone="dark" className="max-w-2xl" />

        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">Interest</span>
            {INTERESTS.map((i) => (
              <Link key={i.slug} href={href({ category: query.category === i.slug ? undefined : i.slug })} className={chip(query.category === i.slug)}>{i.label}</Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">Type</span>
            {Object.entries(KIND_LABELS).filter(([k]) => k !== "OTHER").map(([k, label]) => (
              <Link key={k} href={href({ kind: query.kind === k ? undefined : k })} className={chip(query.kind === k)}>{label}</Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">Where</span>
            {destinations.map((d) => (
              <Link key={d.slug} href={href({ city: query.city === d.slug ? undefined : d.slug })} className={chip(query.city === d.slug)}>{d.name}</Link>
            ))}
          </div>
        </div>

        {results ? (
          <section aria-live="polite" className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-3xl">
                {results.total} {results.total === 1 ? "place" : "places"}
                {query.q && <> for “{query.q}”</>}
              </h2>
              <Link href="/explore" className="text-sm font-semibold text-forest underline underline-offset-4">Clear filters</Link>
            </div>
            {results.total === 0 ? (
              <p className="mt-6 max-w-xl text-ink-soft">
                Nothing matches yet. Our dataset is still small — try a broader search, or{" "}
                <Link href="/contact" className="font-semibold text-forest underline underline-offset-2">tell us what is missing</Link>.
              </p>
            ) : (
              <div className="mt-6 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
                {results.places.map((p) => (
                  <PlaceCard key={p.id} place={p} saved={saved.has(p.id)} canSave={Boolean(user)} showCity />
                ))}
              </div>
            )}
            {results.total > PAGE && (
              <nav aria-label="Pagination" className="mt-8 flex items-center gap-4 text-sm font-semibold">
                {query.offset > 0 && <Link className="text-forest underline underline-offset-4" href={href({ offset: String(Math.max(0, query.offset - PAGE)) } as never)}>← Previous</Link>}
                <span className="text-ink-soft">{query.offset + 1}–{Math.min(results.total, query.offset + PAGE)} of {results.total}</span>
                {query.offset + PAGE < results.total && <Link className="text-forest underline underline-offset-4" href={href({ offset: String(query.offset + PAGE) } as never)}>Next →</Link>}
              </nav>
            )}
          </section>
        ) : (
          <section className="mt-16">
            <h2 className="text-4xl">Destinations</h2>
            <div className="mt-8 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {destinations.map((d, i) => (
                <Link key={d.slug} href={`/destinations/${d.slug}`} className={cn("group block", i % 3 === 1 && "lg:mt-14")}>
                  <div className="relative aspect-[4/5] overflow-hidden bg-sand">
                    {d.heroImageUrl && (
                      <Image src={d.heroImageUrl} alt={`${d.name}, ${d.state}`} fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105" />
                    )}
                  </div>
                  <div className="mt-4 flex items-baseline justify-between gap-3">
                    <h3 className="text-3xl">{d.name}</h3>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">{d.state}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{d.description}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-terracotta-deep">{d.placeCount} places</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
