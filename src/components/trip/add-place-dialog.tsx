"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { KIND_LABELS, distance, duration } from "@/lib/utils/format";
import type { PlaceCard } from "@/server/services/places";

export function AddPlaceDialog({ trip, days, context, excludeIds, replacing, busy, onClose, onAdd }: {
  trip: { destination: { name: string; lat: number; lng: number } };
  days: { index: number }[];
  context: { dayIndex: number; replaceStopId?: string };
  excludeIds: string[];
  replacing: { place: { name: string } } | null;
  busy: boolean;
  onClose: () => void;
  onAdd: (placeId: string, dayIndex: number) => void;
}) {
  const [places, setPlaces] = useState<PlaceCard[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState("");
  const [dayIndex, setDayIndex] = useState(context.dayIndex);

  useEffect(() => {
    let cancelled = false;
    api<{ places: PlaceCard[] }>(`/api/places/nearby?lat=${trip.destination.lat}&lng=${trip.destination.lng}&radiusKm=40&limit=50`)
      .then((d) => !cancelled && setPlaces(d.places))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [trip.destination.lat, trip.destination.lng]);

  const available = useMemo(() => {
    const excluded = new Set(excludeIds);
    const f = filter.trim().toLowerCase();
    return (places ?? []).filter((p) => !excluded.has(p.id) && (!f || p.name.toLowerCase().includes(f)));
  }, [places, excludeIds, filter]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85svh] overflow-hidden bg-paper p-0 sm:max-w-xl">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="font-serif text-3xl font-normal">{replacing ? `Replace ${replacing.place.name}` : "Add a place"}</DialogTitle>
          <DialogDescription>Places within reach of {trip.destination.name} that are not already in your plan. The day is re-timed after you add.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-end gap-3 px-5">
          <div className="min-w-0 flex-1">
            <label htmlFor="add-filter" className="sr-only">Filter places</label>
            <Input id="add-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name" className="h-10 bg-cream" />
          </div>
          {!replacing && days.length > 1 && (
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Day
              <select value={dayIndex} onChange={(e) => setDayIndex(Number(e.target.value))} className="ml-2 h-10 rounded-md border border-input bg-cream px-2 text-sm font-normal normal-case tracking-normal text-ink">
                {days.map((d) => <option key={d.index} value={d.index}>Day {d.index + 1}</option>)}
              </select>
            </label>
          )}
        </div>
        <div className="max-h-[50svh] overflow-y-auto border-t border-border">
          {failed ? (
            <p role="alert" className="p-5 text-sm text-destructive">We could not load places. Close this and try again.</p>
          ) : places === null ? (
            <p className="p-5 text-sm text-ink-soft">Loading places…</p>
          ) : available.length === 0 ? (
            <p className="p-5 text-sm text-ink-soft">{filter ? `No place matches “${filter}”.` : "Every place we have here is already in your plan."}</p>
          ) : (
            <ul className="divide-y divide-border">
              {available.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="block text-xs text-ink-soft">
                      {KIND_LABELS[p.kind]}{p.typicalVisitMins ? ` · about ${duration(p.typicalVisitMins)}` : ""}{p.distanceMeters !== undefined ? ` · ${distance(p.distanceMeters)} from centre` : ""}
                    </span>
                  </span>
                  <button type="button" disabled={busy} onClick={() => onAdd(p.id, replacing ? context.dayIndex : dayIndex)}
                    className="h-9 shrink-0 rounded-full bg-forest px-4 text-xs font-semibold text-cream hover:bg-forest-soft disabled:opacity-50">
                    {busy ? "Saving…" : replacing ? "Use this" : "Add"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
