"use client";

import { useState } from "react";
import { pill } from "@/components/layout/button-link";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const REASONS = [
  { value: "REMOVED_PLACE", label: "I removed something", hint: "Fill the gap and re-balance the days. Removed places stay out." },
  { value: "PLACE_CLOSED", label: "A place is closed", hint: "Remove the closed stop first, then replan around it." },
  { value: "BUDGET_DECREASED", label: "My budget changed", hint: "Re-check the plan against the budget on the Budget tab." },
  { value: "RUNNING_LATE", label: "Visits take longer than planned", hint: "Your edited visit lengths are kept; the rest is rebuilt to fit." },
  { value: "DATES_CHANGED", label: "My dates changed", hint: "Rebuild for the trip’s current dates and weekdays." },
  { value: "SLOWER_PACE", label: "I want slower days", hint: "Shorter days with fewer stops." },
  { value: "OTHER", label: "Just rebuild it", hint: "A fresh pass that favours what you already have." },
] as const;

export function ReplanDialog({ busy, onClose, onReplan }: {
  busy: boolean;
  onClose: () => void;
  onReplan: (body: { reason: string; note?: string }) => void;
}) {
  const [reason, setReason] = useState<string>("REMOVED_PLACE");
  const [note, setNote] = useState("");
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto bg-paper p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl font-normal">Replan this trip</DialogTitle>
          <DialogDescription>
            Creates a new version — your current plan is kept and can be restored. Locked stops stay on their day, and travel time, opening hours and budget are all re-checked.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); onReplan({ reason, ...(note.trim() ? { note: note.trim() } : {}) }); }}>
          <fieldset className="space-y-2">
            <legend className="sr-only">What changed?</legend>
            {REASONS.map((r) => (
              <label key={r.value} className={cn("flex cursor-pointer gap-3 border px-4 py-3 transition-colors", reason === r.value ? "border-forest bg-cream" : "border-border hover:border-forest/50")}>
                <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="mt-1 accent-forest" />
                <span>
                  <span className="block text-sm font-semibold">{r.label}</span>
                  <span className="block text-xs text-ink-soft">{r.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <label htmlFor="replan-note" className="mt-4 block text-sm font-semibold">Note for your records <span className="font-normal text-ink-soft">(optional)</span></label>
          <input id="replan-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} className="mt-2 h-10 w-full rounded-md border border-input bg-cream px-3 text-sm" />
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" className={pill("outline", "md")} onClick={onClose}>Cancel</button>
            <button type="submit" disabled={busy} className={pill("primary", "md")}>{busy ? "Replanning…" : "Replan"}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
