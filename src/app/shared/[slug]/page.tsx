import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/layout/button-link";
import { PublicShell } from "@/components/layout/public-shell";
import { Workspace } from "@/components/trip/workspace";
import { ServiceError } from "@/server/errors";
import { getSharedTripView } from "@/server/services/itinerary";

export const dynamic = "force-dynamic";
// Shared links are private-by-obscurity: keep them out of search engines.
export const metadata: Metadata = { title: "Shared trip", robots: { index: false, follow: false } };

export default async function SharedTripPage({ params }: PageProps<"/shared/[slug]">) {
  const { slug } = await params;
  let view;
  try {
    view = await getSharedTripView(slug);
  } catch (err) {
    if (err instanceof ServiceError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  return (
    <PublicShell>
      <div className="flex flex-col">
        <p className="bg-forest px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-cream">A shared itinerary · read-only</p>
        <Workspace initial={{ ...view, isOwner: false }} readOnly />
        <div className="border-t border-border bg-paper px-5 py-12 text-center">
          <h2 className="text-4xl">Like the look of this?</h2>
          <p className="mx-auto mt-3 max-w-md text-ink-soft">Plan your own trip to {view.trip.destination.name} — or anywhere else we cover.</p>
          <ButtonLink href={`/trips/new?destination=${view.trip.destination.slug}`} className="mt-6">Plan my own trip</ButtonLink>
        </div>
      </div>
    </PublicShell>
  );
}
