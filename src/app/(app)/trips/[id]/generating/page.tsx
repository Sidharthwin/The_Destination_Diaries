import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUserPage } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { GeneratingClient } from "./generating-client";

export const metadata: Metadata = { title: "Building your itinerary" };

export default async function GeneratingPage({ params }: PageProps<"/trips/[id]/generating">) {
  const { id } = await params;
  const user = await requireUserPage(`/trips/${id}/generating`);
  const trip = /^[0-9a-f-]{36}$/i.test(id)
    ? await prisma.trip.findFirst({ where: { id, ownerId: user.id }, include: { destinationCity: true } })
    : null;
  if (!trip) notFound();
  return <GeneratingClient tripId={trip.id} destination={trip.destinationCity.name} hasItinerary={Boolean(trip.activeVersionId)} />;
}
