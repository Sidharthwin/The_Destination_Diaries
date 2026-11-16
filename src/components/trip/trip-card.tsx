import Image from "next/image";
import Link from "next/link";
import { dateRangeLabel, inr } from "@/lib/utils/format";
import type { TripListItem } from "@/server/services/trips";

const STATUS: Record<string, { label: string; tone: string }> = {
  DRAFT: { label: "Draft", tone: "bg-sand text-ink" },
  GENERATING: { label: "Generating", tone: "bg-sand text-ink" },
  PLANNED: { label: "Planned", tone: "bg-forest text-cream" },
  ARCHIVED: { label: "Archived", tone: "bg-ink/10 text-ink-soft" },
};

export function tripHref(t: Pick<TripListItem, "id" | "status" | "stopCount">) {
  return t.status === "DRAFT" && t.stopCount === 0 ? `/trips/new?draft=${t.id}` : `/trips/${t.id}`;
}

export function TripCard({ trip, children }: { trip: TripListItem; children?: React.ReactNode }) {
  const s = STATUS[trip.status] ?? STATUS.DRAFT;
  return (
    <article className="group relative flex flex-col border border-border bg-paper">
      <Link href={tripHref(trip)} className="relative block aspect-[16/9] overflow-hidden bg-sand">
        {trip.destination.heroImageUrl && (
          <Image src={trip.destination.heroImageUrl} alt="" fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
        )}
        <span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${s.tone}`}>{s.label}</span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta-deep">{trip.destination.name}, {trip.destination.state}</p>
        <h3 className="mt-2 text-2xl leading-tight">
          <Link href={tripHref(trip)} className="hover:underline hover:underline-offset-4">{trip.title}</Link>
        </h3>
        <p className="mt-2 text-sm text-ink-soft">
          {dateRangeLabel(trip.startDate, trip.endDate)} · {trip.dayCount} {trip.dayCount === 1 ? "day" : "days"} · {trip.travellers} {trip.travellers === 1 ? "traveller" : "travellers"}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {trip.stopCount > 0 ? `${trip.stopCount} stops planned` : "No itinerary yet"}
          {trip.totalBudgetPaise !== null && ` · Budget ${inr(Number(trip.totalBudgetPaise))}`}
        </p>
        {children && <div className="mt-auto flex items-center gap-4 pt-5">{children}</div>}
      </div>
    </article>
  );
}
