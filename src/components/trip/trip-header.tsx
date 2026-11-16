import Link from "next/link";
import { dateRangeLabel } from "@/lib/utils/format";
import { TripTabs } from "./trip-tabs";

export function TripHeader({ trip, children, showTabs = true }: {
  showTabs?: boolean;
  trip: { id: string; title: string; startDate: string; endDate: string; dayCount: number; travellers: number; destination: { name: string; state: string; slug: string } };
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border bg-paper">
      <div className="mx-auto max-w-[90rem] px-4 pt-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta-deep">
              <Link href={`/destinations/${trip.destination.slug}`} className="hover:underline hover:underline-offset-4">{trip.destination.name}, {trip.destination.state}</Link>
            </p>
            <h1 className="mt-1 truncate text-3xl sm:text-4xl">{trip.title}</h1>
            <p className="mt-1 text-sm text-ink-soft">
              {dateRangeLabel(trip.startDate, trip.endDate)} · {trip.dayCount} {trip.dayCount === 1 ? "day" : "days"} · {trip.travellers} {trip.travellers === 1 ? "traveller" : "travellers"}
            </p>
          </div>
          {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
        </div>
        {showTabs ? <div className="mt-5"><TripTabs tripId={trip.id} /></div> : <div className="h-5" />}
      </div>
    </header>
  );
}
