"use client";

import {
  AlertTriangle, ArrowDown, ArrowUp, Clock, GitBranch, List, Lock, Map as MapIcon, Plus, RefreshCcw,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { pill } from "@/components/layout/button-link";
import { TripMap } from "@/components/map/trip-map";
import { ApiError, api } from "@/lib/api-client";
import { KIND_LABELS, MODE_LABELS, clock, distance, duration, inr, longDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { TripView } from "@/server/services/itinerary";
import { AddPlaceDialog } from "./add-place-dialog";
import { ReplanDialog } from "./replan-dialog";
import { StopSheet } from "./stop-sheet";
import { TripHeader } from "./trip-header";
import { VersionsDialog } from "./versions-dialog";

type View = TripView & { isOwner: boolean };
export type WorkspaceStop = View["days"][number]["stops"][number];

export function Workspace({ initial, readOnly = false }: { initial: View; readOnly?: boolean }) {
  const [view, setView] = useState(initial);
  const [day, setDay] = useState<number | "all">(0);
  const [pane, setPane] = useState<"list" | "map">("list");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "add" | "replan" | "versions">(null);
  const [addContext, setAddContext] = useState<{ dayIndex: number; replaceStopId?: string }>({ dayIndex: 0 });

  const { trip, version, days } = view;
  const viewingOld = Boolean(version && trip.activeVersionId && version.id !== trip.activeVersionId);
  const canEdit = !readOnly && !viewingOld;
  const base = `/api/trips/${trip.id}`;

  /** Every mutation returns the full, re-validated trip view. */
  const mutate = useCallback(
    async (fn: () => Promise<View>, done?: string) => {
      setBusy(true);
      setError(null);
      setStatus(null);
      try {
        const next = await fn();
        setView((prev) => ({ ...next, isOwner: next.isOwner ?? prev.isOwner }));
        if (done) setStatus(done);
        return true;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const shownDays = day === "all" ? days : days.filter((d) => d.index === day);
  const allStops = useMemo(() => days.flatMap((d) => d.stops.map((s) => ({ ...s, dayIndex: d.index }))), [days]);
  const selected = allStops.find((s) => s.id === selectedId) ?? null;
  const points = useMemo(
    () => shownDays.flatMap((d) => d.stops.map((s) => ({ id: s.id, lat: s.place.lat, lng: s.place.lng, label: s.place.name, group: d.index }))),
    [shownDays],
  );
  const totalStops = allStops.length;
  const overBudget = version && trip.totalBudgetPaise !== null && version.estimatedPaise > trip.totalBudgetPaise;

  const move = (stop: WorkspaceStop, delta: number) =>
    mutate(() => api<View>(`${base}/stops/${stop.id}`, { method: "PATCH", body: { orderIndex: stop.orderIndex + delta } }), "Order updated.");

  if (!version) {
    return (
      <>
        <TripHeader trip={trip} showTabs={!readOnly} />
        <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-20 text-center">
          <h2 className="text-4xl">No itinerary yet</h2>
          <p className="mt-3 text-ink-soft">{readOnly ? "The owner has not built this itinerary yet." : "This trip is saved as a draft. Build the itinerary when you are ready."}</p>
          <div className={cn("mt-8 flex flex-wrap justify-center gap-3", readOnly && "hidden")}>
            <Link href={`/trips/${trip.id}/generating`} className={pill("accent", "md")}>Build my itinerary</Link>
            <Link href={`/trips/new?draft=${trip.id}`} className={pill("outline", "md")}>Edit trip details</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TripHeader trip={trip} showTabs={!readOnly}>
        {!readOnly && (
          <>
            <button type="button" className={pill("outline", "sm")} onClick={() => setDialog("versions")}>
              <GitBranch aria-hidden className="size-3.5" /> Version {version.versionNumber} of {view.versions.length}
            </button>
            <button type="button" disabled={!canEdit || busy} className={pill("outline", "sm")} onClick={() => { setAddContext({ dayIndex: day === "all" ? 0 : day }); setDialog("add"); }}>
              <Plus aria-hidden className="size-3.5" /> Add place
            </button>
            <button type="button" disabled={!canEdit || busy} className={pill("primary", "sm")} onClick={() => setDialog("replan")}>
              <RefreshCcw aria-hidden className="size-3.5" /> Replan
            </button>
          </>
        )}
      </TripHeader>

      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6">
        {viewingOld && (
          <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-terracotta/60 bg-paper px-4 py-3 text-sm">
            <span>You are viewing <strong>version {version.versionNumber}</strong> ({version.label}). It is read-only.</span>
            <span className="flex gap-4">
              <button type="button" disabled={busy} className="font-semibold text-forest underline underline-offset-4"
                onClick={() => mutate(() => api<View>(`${base}/versions/${version.id}/activate`, { method: "POST" }), `Version ${version.versionNumber} restored.`)}>
                Restore this version
              </button>
              <button type="button" disabled={busy} className="font-semibold underline underline-offset-4"
                onClick={() => mutate(() => api<View>(base))}>
                Back to current
              </button>
            </span>
          </div>
        )}
        {(overBudget || !version.isFeasible) && (
          <div role="alert" className="mt-4 border-l-4 border-terracotta bg-paper px-4 py-3 text-sm">
            <p className="flex items-center gap-2 font-semibold"><AlertTriangle aria-hidden className="size-4 text-terracotta-deep" />
              {overBudget
                ? `This plan is estimated at ${inr(version.estimatedPaise)} — ${inr(version.estimatedPaise - (trip.totalBudgetPaise ?? 0))} over your budget.`
                : "Some days need attention — see the notes on each day."}
            </p>
            {overBudget && version.alternatives.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-ink-soft">
                {version.alternatives.map((a) => <li key={a.kind}>{a.message} <span className="tabular">({inr(a.estimatedPaise)})</span></li>)}
              </ul>
            )}
            {overBudget && <Link href={`/trips/${trip.id}/budget`} className="mt-2 inline-block font-semibold text-forest underline underline-offset-4">Open the budget</Link>}
          </div>
        )}
        {error && <p role="alert" className="mt-4 border-l-4 border-destructive bg-paper px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
        <p role="status" aria-live="polite" className="sr-only">{busy ? "Saving changes…" : (status ?? "")}</p>

        <div className="mt-4 flex items-center justify-between gap-3 lg:hidden">
          <div role="tablist" aria-label="View" className="inline-flex rounded-full border border-border bg-paper p-1">
            {(["list", "map"] as const).map((p) => (
              <button key={p} role="tab" aria-selected={pane === p} onClick={() => setPane(p)}
                className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold", pane === p ? "bg-forest text-cream" : "text-ink-soft")}>
                {p === "list" ? <List aria-hidden className="size-4" /> : <MapIcon aria-hidden className="size-4" />}{p === "list" ? "List" : "Map"}
              </button>
            ))}
          </div>
          <span className="text-xs text-ink-soft">{busy ? "Saving…" : (status ?? `${totalStops} stops`)}</span>
        </div>

        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto" role="tablist" aria-label="Day">
          <button role="tab" aria-selected={day === "all"} onClick={() => setDay("all")} className={cn("h-10 shrink-0 rounded-full border px-4 text-sm font-semibold", day === "all" ? "border-forest bg-forest text-cream" : "border-border bg-paper")}>
            All days
          </button>
          {days.map((d) => (
            <button key={d.id} role="tab" aria-selected={day === d.index} onClick={() => setDay(d.index)}
              className={cn("h-10 shrink-0 rounded-full border px-4 text-sm font-semibold", day === d.index ? "border-forest bg-forest text-cream" : "border-border bg-paper")}>
              Day {d.index + 1} <span className={cn("font-normal", day === d.index ? "text-cream/75" : "text-ink-soft")}>· {longDate(d.date)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-[90rem] flex-1 gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <section aria-label="Itinerary" className={cn(pane === "map" && "hidden lg:block")}>
          {version.summary && day === "all" && <p className="mb-6 max-w-2xl font-serif text-xl leading-snug">{version.summary}</p>}
          {shownDays.map((d) => {
            const travel = d.stops.reduce((n, s) => n + (s.legToNext?.durationMins ?? 0), 0);
            return (
              <article key={d.id} className="mb-10">
                <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink/15 pb-3">
                  <h2 className="text-2xl">
                    <span className="text-terracotta-deep">Day {d.index + 1}</span>
                    {d.title && <span> · {d.title}</span>}
                  </h2>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">{longDate(d.date)} · {d.stops.length} stops · {duration(travel)} travel</p>
                </header>
                {d.note && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">{d.note}</p>}
                {d.warnings.map((w) => (
                  <p key={w.code + (w.placeId ?? "")} role="alert" className="mt-3 flex items-start gap-2 border-l-2 border-terracotta bg-paper px-3 py-2 text-sm">
                    <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-terracotta-deep" /> {w.message}
                  </p>
                ))}
                {d.stops.length === 0 ? (
                  <div className="mt-4 border border-dashed border-border px-4 py-6 text-sm text-ink-soft">
                    A free day.{" "}
                    {canEdit && <button type="button" className="font-semibold text-forest underline underline-offset-4" onClick={() => { setAddContext({ dayIndex: d.index }); setDialog("add"); }}>Add a place</button>}
                  </div>
                ) : (
                  <ol className="mt-4">
                    {d.stops.map((s, i) => (
                      <li key={s.id} className="grid grid-cols-[4.5rem_1.25rem_minmax(0,1fr)] gap-x-3"
                        onMouseEnter={() => setActiveId(s.id)} onMouseLeave={() => setActiveId(null)}>
                        <span className="pt-3 text-right text-sm font-semibold tabular text-ink-soft">{clock(s.arrivalMin)}</span>
                        <span className="flex flex-col items-center">
                          <span className={cn("mt-4 inline-flex size-3 rounded-full border-2 transition-colors", activeId === s.id || selectedId === s.id ? "border-terracotta bg-terracotta" : "border-forest bg-cream")} />
                          {i < d.stops.length - 1 && <span className="w-px flex-1 bg-border" />}
                        </span>
                        <div className="pb-3">
                          <div className={cn("flex items-start gap-2 border bg-paper p-3 transition-colors", selectedId === s.id ? "border-forest" : "border-border hover:border-forest/50")}>
                            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(s.id)} aria-label={`${s.place.name} — details and editing`}>
                              <span className="flex items-center gap-2">
                                <span className="truncate font-semibold">{s.place.name}</span>
                                {s.locked && <Lock aria-label="Locked" className="size-3.5 shrink-0 text-terracotta-deep" />}
                              </span>
                              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
                                <span>{KIND_LABELS[s.place.kind]}</span>
                                <span className="inline-flex items-center gap-1"><Clock aria-hidden className="size-3" />{duration(s.visitDurationMins)}, until {clock(s.departureMin)}</span>
                                {!s.hoursKnown && <span className="italic" title="We have no opening hours on record for this place.">hours not on record</span>}
                              </span>
                              {s.note && <span className="mt-1 block text-xs italic text-ink-soft">“{s.note}”</span>}
                            </button>
                            {canEdit && (
                              <span className="flex shrink-0 flex-col">
                                <button type="button" disabled={busy || i === 0} onClick={() => move(s, -1)} aria-label={`Move ${s.place.name} earlier`} className="inline-flex size-7 items-center justify-center rounded text-ink-soft hover:bg-sand-soft hover:text-ink disabled:opacity-25"><ArrowUp className="size-4" /></button>
                                <button type="button" disabled={busy || i === d.stops.length - 1} onClick={() => move(s, 1)} aria-label={`Move ${s.place.name} later`} className="inline-flex size-7 items-center justify-center rounded text-ink-soft hover:bg-sand-soft hover:text-ink disabled:opacity-25"><ArrowDown className="size-4" /></button>
                              </span>
                            )}
                          </div>
                          {s.legToNext && (
                            <p className="py-2 pl-3 text-[11px] uppercase tracking-[0.12em] text-ink-soft">
                              {MODE_LABELS[s.legToNext.mode]} · {duration(s.legToNext.durationMins)} · {distance(s.legToNext.distanceMeters)}
                              <span className="normal-case tracking-normal"> ({s.legToNext.provider === "MAPBOX" ? "measured route" : "estimate"})</span>
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                {canEdit && d.stops.length > 0 && (
                  <button type="button" disabled={busy} className="ml-[6.5rem] text-sm font-semibold text-forest underline underline-offset-4" onClick={() => { setAddContext({ dayIndex: d.index }); setDialog("add"); }}>
                    + Add a place to day {d.index + 1}
                  </button>
                )}
              </article>
            );
          })}

          {version.dropped.length > 0 && (
            <details className="mb-8 border border-border bg-paper">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Left out of this plan ({version.dropped.length}) — and why</summary>
              <ul className="divide-y divide-border border-t border-border">
                {version.dropped.map((p) => (
                  <li key={p.placeId} className="flex flex-wrap items-baseline justify-between gap-3 px-4 py-3 text-sm">
                    <span className="text-ink-soft">{p.message}</span>
                    {canEdit && (
                      <button type="button" disabled={busy} className="font-semibold text-forest underline underline-offset-4"
                        onClick={() => mutate(() => api<View>(`${base}/stops`, { method: "POST", body: { placeId: p.placeId, dayIndex: day === "all" ? 0 : day } }), "Place added.")}>
                        Add to {day === "all" ? "day 1" : `day ${day + 1}`} anyway
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <ul className="space-y-1 text-xs leading-relaxed text-ink-soft">
            {version.notes.map((n) => <li key={n}>{n}</li>)}
            {version.explanationSource === "ai" && <li>Day summaries were written by AI from the computed schedule; times, routes and costs were not.</li>}
          </ul>
        </section>

        <aside aria-label="Map and budget" className={cn("lg:sticky lg:top-20 lg:self-start", pane === "list" && "hidden lg:block")}>
          <div className="h-[60svh] overflow-hidden border border-border lg:h-[calc(100svh-27rem)] lg:min-h-[24rem]">
            <TripMap className="h-full w-full" points={points} activeId={activeId ?? selectedId} onHover={setActiveId} onSelect={setSelectedId} />
          </div>
          {!readOnly && (
            <Link href={`/trips/${trip.id}/budget`} className="mt-4 grid grid-cols-3 gap-px border border-border bg-border text-left transition-colors hover:border-forest">
              {[
                ["Estimated", inr(version.estimatedPaise)],
                ["Budget", trip.totalBudgetPaise === null ? "Not set" : inr(trip.totalBudgetPaise)],
                [overBudget ? "Over by" : "Remaining", trip.totalBudgetPaise === null ? "—" : inr(Math.abs(trip.totalBudgetPaise - version.estimatedPaise))],
              ].map(([label, value], i) => (
                <span key={label} className="bg-paper p-3">
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">{label}</span>
                  <span className={cn("mt-0.5 block font-serif text-xl tabular", i === 2 && overBudget && "text-destructive")}>{value}</span>
                </span>
              ))}
            </Link>
          )}
        </aside>
      </div>

      <StopSheet
        stop={selected}
        dayCount={days.length}
        canEdit={canEdit}
        busy={busy}
        onClose={() => setSelectedId(null)}
        onUpdate={(patch, done) => (selected ? mutate(() => api<View & { stopId: string }>(`${base}/stops/${selected.id}`, { method: "PATCH", body: patch }).then((v) => { setSelectedId(v.stopId); return v; }), done) : Promise.resolve(false))}
        onRemove={async () => {
          if (!selected) return;
          const ok = await mutate(() => api<View>(`${base}/stops/${selected.id}`, { method: "DELETE" }), `${selected.place.name} removed.`);
          if (ok) setSelectedId(null);
        }}
        onReplace={() => {
          if (!selected) return;
          setAddContext({ dayIndex: selected.dayIndex, replaceStopId: selected.id });
          setDialog("add");
        }}
      />
      {dialog === "add" && (
        <AddPlaceDialog
          trip={trip}
          days={days}
          context={addContext}
          excludeIds={allStops.filter((s) => s.id !== addContext.replaceStopId).map((s) => s.place.id)}
          replacing={allStops.find((s) => s.id === addContext.replaceStopId) ?? null}
          busy={busy}
          onClose={() => setDialog(null)}
          onAdd={async (placeId, dayIndex) => {
            const replacing = allStops.find((s) => s.id === addContext.replaceStopId);
            const ok = await mutate(async () => {
              let orderIndex: number | undefined;
              if (replacing) {
                orderIndex = replacing.orderIndex;
                await api<View>(`${base}/stops/${replacing.id}`, { method: "DELETE" });
              }
              return api<View>(`${base}/stops`, { method: "POST", body: { placeId, dayIndex, ...(orderIndex !== undefined ? { orderIndex } : {}) } });
            }, replacing ? "Place replaced." : "Place added.");
            if (ok) {
              setDialog(null);
              setSelectedId(null);
              setDay(dayIndex);
            }
          }}
        />
      )}
      {dialog === "replan" && (
        <ReplanDialog
          busy={busy}
          onClose={() => setDialog(null)}
          onReplan={async (body) => {
            const ok = await mutate(() => api<View>(`${base}/replan`, { method: "POST", body }), "Replanned as a new version.");
            if (ok) setDialog(null);
          }}
        />
      )}
      {dialog === "versions" && (
        <VersionsDialog
          versions={view.versions}
          viewingId={version.id}
          busy={busy}
          onClose={() => setDialog(null)}
          onView={async (id) => {
            const ok = await mutate(() => api<View>(`${base}?version=${id}`));
            if (ok) setDialog(null);
          }}
          onRestore={async (id) => {
            const ok = await mutate(() => api<View>(`${base}/versions/${id}/activate`, { method: "POST" }), "Version restored.");
            if (ok) setDialog(null);
          }}
        />
      )}
    </>
  );
}
