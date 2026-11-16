"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TripMap } from "@/components/map/trip-map";
import { ApiError, api } from "@/lib/api-client";
import { KIND_LABELS, distance, duration } from "@/lib/utils/format";
import type { PlaceCard } from "@/server/services/places";

interface Anchor {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export function NearbyPanel({ tripId, anchors, days, inPlan, hasItinerary }: {
  tripId: string;
  anchors: Anchor[];
  days: { index: number }[];
  inPlan: string[];
  hasItinerary: boolean;
}) {
  const [anchorId, setAnchorId] = useState(anchors[0].id);
  const [radiusKm, setRadiusKm] = useState(3);
  const [kind, setKind] = useState("");
  const [dayIndex, setDayIndex] = useState(0);
  const [result, setResult] = useState<{ key: string; places: PlaceCard[] | null; error: string | null } | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set(inPlan));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const anchor = anchors.find((a) => a.id === anchorId) ?? anchors[0];

  const queryKey = `${anchor.lat},${anchor.lng},${radiusKm},${kind}`;
  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ lat: String(anchor.lat), lng: String(anchor.lng), radiusKm: String(radiusKm), limit: "30" });
    if (kind) qs.set("kind", kind);
    api<{ places: PlaceCard[] }>(`/api/places/nearby?${qs}`)
      .then((d) => !cancelled && setResult({ key: queryKey, places: d.places, error: null }))
      .catch((e) => !cancelled && setResult({ key: queryKey, places: null, error: e instanceof ApiError ? e.message : "Could not load nearby places." }));
    return () => {
      cancelled = true;
    };
  }, [anchor.lat, anchor.lng, radiusKm, kind, queryKey]);
  // A result only counts for the query that produced it; anything else is "loading".
  const current = result?.key === queryKey ? result : null;
  const places = current?.places ?? null;
  const error = addError ?? current?.error ?? null;

  const points = useMemo(
    () => (places ?? []).map((p, i) => ({ id: p.id, lat: p.lat, lng: p.lng, label: p.name, group: i })),
    [places],
  );

  async function add(place: PlaceCard) {
    setBusyId(place.id);
    setAddError(null);
    try {
      await api(`/api/trips/${tripId}/stops`, { method: "POST", body: { placeId: place.id, dayIndex } });
      setAdded((prev) => new Set(prev).add(place.id));
    } catch (e) {
      setAddError(e instanceof ApiError ? e.message : "Could not add this place.");
    } finally {
      setBusyId(null);
    }
  }

  const select = "h-10 rounded-md border border-input bg-paper px-2 text-sm";
  return (
    <div className="mx-auto grid w-full max-w-[90rem] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section aria-label="Nearby places">
        <h2 className="text-3xl">What else is close by</h2>
        <p className="mt-2 text-sm text-ink-soft">Distances are straight-line from the point you choose, measured by the database.</p>
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Near
            <select value={anchorId} onChange={(e) => setAnchorId(e.target.value)} className={`${select} ml-2 max-w-[14rem] font-normal normal-case tracking-normal text-ink`}>
              {anchors.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Within
            <select value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} className={`${select} ml-2 font-normal normal-case tracking-normal text-ink`}>
              {[1, 3, 5, 10, 25].map((r) => <option key={r} value={r}>{r} km</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Type
            <select value={kind} onChange={(e) => setKind(e.target.value)} className={`${select} ml-2 font-normal normal-case tracking-normal text-ink`}>
              <option value="">Any</option>
              {Object.entries(KIND_LABELS).filter(([k]) => k !== "OTHER").map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          {hasItinerary && days.length > 1 && (
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Add to
              <select value={dayIndex} onChange={(e) => setDayIndex(Number(e.target.value))} className={`${select} ml-2 font-normal normal-case tracking-normal text-ink`}>
                {days.map((d) => <option key={d.index} value={d.index}>Day {d.index + 1}</option>)}
              </select>
            </label>
          )}
        </div>
        {error && <p role="alert" className="mt-4 text-sm font-medium text-destructive">{error}</p>}
        <div aria-live="polite" className="mt-5">
          {places === null && !error ? (
            <p className="text-sm text-ink-soft">Searching…</p>
          ) : places && places.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing in our dataset within {radiusKm} km. Try a wider radius.</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {(places ?? []).map((p) => (
                <li key={p.id} className="flex items-center gap-4 py-3" onMouseEnter={() => setActive(p.id)} onMouseLeave={() => setActive(null)}>
                  <span className="w-16 shrink-0 text-right text-sm font-semibold tabular text-ink-soft">{distance(p.distanceMeters ?? 0)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.name}</span>
                    <span className="block text-xs text-ink-soft">{KIND_LABELS[p.kind]}{p.typicalVisitMins ? ` · about ${duration(p.typicalVisitMins)}` : ""}</span>
                  </span>
                  {added.has(p.id) ? (
                    <span className="text-xs font-semibold text-forest">In your plan</span>
                  ) : hasItinerary ? (
                    <button type="button" disabled={busyId !== null} onClick={() => add(p)} className="h-9 shrink-0 rounded-full bg-forest px-4 text-xs font-semibold text-cream hover:bg-forest-soft disabled:opacity-50">
                      {busyId === p.id ? "Adding…" : `Add to day ${dayIndex + 1}`}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
        {!hasItinerary && <p className="mt-4 text-sm text-ink-soft">Build an itinerary first to add places to it. <Link href={`/trips/${tripId}/generating`} className="font-semibold text-forest underline underline-offset-2">Build it now</Link>.</p>}
        {added.size > inPlan.length && <p role="status" className="mt-4 text-sm text-forest">Added. <Link href={`/trips/${tripId}`} className="font-semibold underline underline-offset-2">See the updated itinerary</Link>.</p>}
      </section>
      <div className="h-[55svh] overflow-hidden border border-border lg:sticky lg:top-20 lg:h-[calc(100svh-16rem)]">
        <TripMap className="h-full w-full" points={points} activeId={active} onHover={setActive} />
      </div>
    </div>
  );
}
