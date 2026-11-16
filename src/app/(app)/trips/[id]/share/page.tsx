import type { Metadata } from "next";
import { SharePanel } from "@/components/trip/share-panel";
import { TripHeader } from "@/components/trip/trip-header";
import { siteUrl } from "@/lib/supabase/config";
import { loadTripPage } from "@/server/services/trip-page";

export const metadata: Metadata = { title: "Share" };

export default async function SharePage({ params }: PageProps<"/trips/[id]/share">) {
  const { id } = await params;
  const { view } = await loadTripPage(id, `/trips/${id}/share`);
  const { trip } = view;
  return (
    <>
      <TripHeader trip={trip} />
      <SharePanel
        tripId={id}
        initialEnabled={trip.shareEnabled}
        initialUrl={trip.shareEnabled && trip.shareSlug ? `${siteUrl()}/shared/${trip.shareSlug}` : null}
        isOwner={view.isOwner}
        hasItinerary={Boolean(view.version)}
      />
    </>
  );
}
