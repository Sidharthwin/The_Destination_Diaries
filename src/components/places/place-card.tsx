import { Clock } from "lucide-react";
import { KIND_LABELS, duration } from "@/lib/utils/format";
import type { PlaceCard as PlaceCardData } from "@/server/services/places";
import { SaveButton } from "./save-button";

export function PlaceCard({ place, saved, canSave, showCity = false }: {
  place: PlaceCardData;
  saved: boolean;
  canSave: boolean;
  showCity?: boolean;
}) {
  return (
    <article id={`place-${place.id}`} className="group flex scroll-mt-28 flex-col border-t border-ink/15 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta-deep">
            {KIND_LABELS[place.kind] ?? "Place"}
            {showCity && <span className="text-ink-soft"> · {place.city.name}, {place.city.state}</span>}
          </p>
          <h3 className="mt-2 text-2xl leading-tight">{place.name}</h3>
        </div>
        <SaveButton placeId={place.id} initialSaved={saved} canSave={canSave} />
      </div>
      {place.description && <p className="mt-3 text-sm leading-relaxed text-ink-soft">{place.description}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-soft">
        {place.typicalVisitMins && (
          <span className="inline-flex items-center gap-1.5"><Clock aria-hidden className="size-3.5" /> Allow about {duration(place.typicalVisitMins)}</span>
        )}
        {place.categories.map((c) => (
          <span key={c.slug} className="rounded-full border border-border px-2.5 py-0.5">{c.name}</span>
        ))}
        {place.verificationStatus !== "VERIFIED" && (
          <span className="italic" title="Details for this place have not been independently verified yet.">Unverified listing</span>
        )}
      </div>
    </article>
  );
}
