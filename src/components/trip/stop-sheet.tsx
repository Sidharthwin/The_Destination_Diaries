"use client";

import { Lock, LockOpen, Minus, Plus, Repeat, Trash2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { pill } from "@/components/layout/button-link";
import { ReportPlace } from "@/components/places/report-place";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { INTERESTS } from "@/lib/constants/travel";
import { KIND_LABELS, clock, duration } from "@/lib/utils/format";
import type { WorkspaceStop } from "./workspace";

const DESKTOP = "(min-width: 1024px)";
function subscribeDesktop(cb: () => void) {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, () => window.matchMedia(DESKTOP).matches, () => false);
}

function NoteForm({ initial, busy, onSave }: { initial: string; busy: boolean; onSave: (note: string | null) => void }) {
  const [note, setNote] = useState(initial);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(note.trim() || null); }}>
      <label htmlFor="stop-note" className="text-sm font-semibold">Your note</label>
      <textarea id="stop-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Book the audio guide" className="mt-2 block w-full rounded-md border border-input bg-cream p-3 text-sm" />
      <button type="submit" disabled={busy || note.trim() === initial} className={pill("outline", "sm", "mt-2")}>Save note</button>
    </form>
  );
}

/** Stop details: a bottom sheet on phones, a side panel on desktop. */
export function StopSheet({ stop, dayCount, canEdit, busy, onClose, onUpdate, onRemove, onReplace }: {
  stop: (WorkspaceStop & { dayIndex: number }) | null;
  dayCount: number;
  canEdit: boolean;
  busy: boolean;
  onClose: () => void;
  onUpdate: (patch: Record<string, unknown>, done: string) => Promise<boolean>;
  onRemove: () => void;
  onReplace: () => void;
}) {
  const desktop = useIsDesktop();

  return (
    <Sheet open={stop !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side={desktop ? "right" : "bottom"} className="max-h-[85svh] overflow-y-auto bg-paper lg:max-h-none">
        {stop && (
          <>
            <SheetHeader className="pr-12">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-terracotta-deep">Day {stop.dayIndex + 1} · {KIND_LABELS[stop.place.kind]}</p>
              <SheetTitle className="font-serif text-3xl font-normal leading-tight">{stop.place.name}</SheetTitle>
              <SheetDescription>
                {clock(stop.arrivalMin)} – {clock(stop.departureMin)} · {duration(stop.visitDurationMins)}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-6 px-4 pb-6">
              {stop.place.description && <p className="leading-relaxed text-ink-soft">{stop.place.description}</p>}
              <dl className="space-y-2 border-y border-border py-4 text-sm">
                {stop.matchedInterests.length > 0 && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-soft">Why it was chosen</dt>
                    <dd className="text-right">Matches {stop.matchedInterests.map((i) => INTERESTS.find((x) => x.slug === i)?.label.toLowerCase() ?? i).join(", ")}</dd>
                  </div>
                )}
                {stop.score !== null && (
                  <div className="flex justify-between gap-4"><dt className="text-ink-soft">Preference score</dt><dd className="tabular">{stop.score} / 100</dd></div>
                )}
                <div className="flex justify-between gap-4"><dt className="text-ink-soft">Opening hours</dt><dd>{stop.hoursKnown ? "Checked against your schedule" : "Not on record — confirm locally"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-ink-soft">Entry price</dt><dd>{stop.priceKnown ? "Included in your budget" : "Not on record"}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-ink-soft">Listing</dt><dd>{stop.place.verificationStatus === "VERIFIED" ? "Verified" : "Unverified"}</dd></div>
              </dl>

              {canEdit ? (
                <>
                  <div>
                    <p className="text-sm font-semibold">Time here</p>
                    <div className="mt-2 flex items-center gap-4">
                      <button type="button" disabled={busy || stop.visitDurationMins <= 15} aria-label="15 minutes less" className="inline-flex size-10 items-center justify-center rounded-full border border-border hover:border-forest disabled:opacity-40"
                        onClick={() => onUpdate({ visitDurationMins: Math.max(10, stop.visitDurationMins - 15) }, "Duration updated.")}><Minus className="size-4" /></button>
                      <output className="w-28 text-center font-serif text-2xl tabular">{duration(stop.visitDurationMins)}</output>
                      <button type="button" disabled={busy || stop.visitDurationMins >= 600} aria-label="15 minutes more" className="inline-flex size-10 items-center justify-center rounded-full border border-border hover:border-forest disabled:opacity-40"
                        onClick={() => onUpdate({ visitDurationMins: Math.min(600, stop.visitDurationMins + 15) }, "Duration updated.")}><Plus className="size-4" /></button>
                    </div>
                  </div>
                  {dayCount > 1 && (
                    <label className="block text-sm font-semibold">
                      Move to another day
                      <select className="mt-2 block h-11 w-full rounded-md border border-input bg-cream px-3 text-sm font-normal" value={stop.dayIndex} disabled={busy}
                        onChange={(e) => onUpdate({ dayIndex: Number(e.target.value) }, "Moved to another day.")}>
                        {Array.from({ length: dayCount }, (_, i) => <option key={i} value={i}>Day {i + 1}</option>)}
                      </select>
                    </label>
                  )}
                  <NoteForm key={`${stop.id}:${stop.note ?? ""}`} initial={stop.note ?? ""} busy={busy} onSave={(note) => onUpdate({ note }, "Note saved.")} />
                  <div className="flex flex-wrap gap-2 border-t border-border pt-5">
                    <button type="button" disabled={busy} className={pill("outline", "sm")} aria-pressed={stop.locked}
                      onClick={() => onUpdate({ locked: !stop.locked }, stop.locked ? "Unlocked." : "Locked — replanning will keep this stop on this day.")}>
                      {stop.locked ? <><LockOpen aria-hidden className="size-3.5" /> Unlock</> : <><Lock aria-hidden className="size-3.5" /> Lock for replans</>}
                    </button>
                    <button type="button" disabled={busy} className={pill("outline", "sm")} onClick={onReplace}><Repeat aria-hidden className="size-3.5" /> Replace</button>
                    <button type="button" disabled={busy} className={pill("outline", "sm", "border-destructive/40 text-destructive hover:bg-destructive hover:text-cream")} onClick={onRemove}><Trash2 aria-hidden className="size-3.5" /> Remove</button>
                  </div>
                  <ReportPlace key={stop.place.id} placeId={stop.place.id} />
                </>
              ) : (
                stop.note && <p className="text-sm italic text-ink-soft">“{stop.note}”</p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
