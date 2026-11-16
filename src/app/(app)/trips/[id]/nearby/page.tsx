import type { Metadata } from "next";
import { NearbyPanel } from "@/components/trip/nearby-panel";
import { TripHeader } from "@/components/trip/trip-header";
import { loadTripPage } from "@/server/services/trip-page";

export const metadata: Metadata = { title: "Nearby" };

export default async function NearbyPage({ params }: PageProps<"/trips/[id]/nearby">) {
  const { id } = await params;
  const { view } = await loadTripPage(id, `/trips/${id}/nearby`);
  const stops = view.days.flatMap((d) => d.stops.map((s) => ({ ...s, day: d.index })));
  const anchors = [
    { id: "centre", label: `${view.trip.destination.name} centre`, lat: view.trip.destination.lat, lng: view.trip.destination.lng },
    ...stops.map((s) => ({ id: s.id, label: `Day ${s.day + 1}: ${s.place.name}`, lat: s.place.lat, lng: s.place.lng })),
  ];
  return (
    <>
      <TripHeader trip={view.trip} />
      <NearbyPanel
        tripId={id}
        anchors={anchors}
        days={view.days.map((d) => ({ index: d.index }))}
        inPlan={stops.map((s) => s.place.id)}
        hasItinerary={Boolean(view.version)}
      />
    </>
  );
}
