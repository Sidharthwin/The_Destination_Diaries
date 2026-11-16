import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Workspace } from "@/components/trip/workspace";
import { requireUserPage } from "@/server/auth/session";
import { ServiceError } from "@/server/errors";
import { getTripView } from "@/server/services/itinerary";

export const metadata: Metadata = { title: "Trip" };

export default async function TripPage({ params }: PageProps<"/trips/[id]">) {
  const { id } = await params;
  const user = await requireUserPage(`/trips/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  let view;
  try {
    view = await getTripView(id, user.id);
  } catch (err) {
    // Trips you have no access to look exactly like trips that do not exist.
    if (err instanceof ServiceError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  return <Workspace initial={view} />;
}
