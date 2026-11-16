import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/layout/button-link";
import { DeleteTripButton } from "@/components/trip/delete-trip-button";
import { TripCard, tripHref } from "@/components/trip/trip-card";
import { requireUserPage } from "@/server/auth/session";
import { listTrips } from "@/server/services/trips";

export const metadata: Metadata = { title: "My trips" };

export default async function MyTripsPage() {
  const user = await requireUserPage("/my-trips");
  const trips = await listTrips(user.id);
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My trips</p>
          <h1 className="mt-3 text-5xl sm:text-6xl">Every plan, in one place</h1>
        </div>
        <ButtonLink href="/trips/new">Plan a new trip</ButtonLink>
      </div>
      {trips.length === 0 ? (
        <p className="mt-12 max-w-md text-ink-soft">
          No trips yet. <Link href="/trips/new" className="font-semibold text-forest underline underline-offset-2">Plan your first one</Link> — it takes a couple of minutes.
        </p>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((t) => (
            <TripCard key={t.id} trip={t}>
              <Link href={tripHref(t)} className="text-sm font-semibold text-forest underline underline-offset-4">
                {t.status === "DRAFT" && t.stopCount === 0 ? "Continue draft" : "Open"}
              </Link>
              {t.isOwner && <DeleteTripButton tripId={t.id} title={t.title} />}
            </TripCard>
          ))}
        </div>
      )}
    </div>
  );
}
