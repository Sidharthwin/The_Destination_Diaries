"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { pill } from "@/components/layout/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api-client";
import { BUDGET_CATEGORIES } from "@/lib/constants/travel";
import { inr, longDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface Line {
  id: string;
  category: string;
  amountPaise: number;
  source: string;
  notes?: string | null;
  note?: string | null;
  confidence?: string;
  dayIndex: number | null;
  placeName?: string | null;
  spentAt?: string;
}

export interface BudgetData {
  summary: {
    totalBudgetPaise: number | null;
    estimatedPaise: number;
    actualPaise: number;
    remainingVsEstimatePaise: number | null;
    remainingVsActualPaise: number | null;
    perPersonEstimatedPaise: number;
    perDayEstimatedPaise: number;
    overBudget: boolean;
    categories: { category: string; estimatedPaise: number; actualPaise: number; unavailable: boolean }[];
  };
  estimates: Line[];
  actuals: Line[];
  unavailable: { category: string; reason: string }[];
  alternatives: { kind: string; message: string; estimatedPaise: number }[];
  hasItinerary: boolean;
}

const SOURCE: Record<string, { label: string; tone: string; title: string }> = {
  VERIFIED: { label: "Verified price", tone: "bg-forest text-cream", title: "Checked against a reliable source." },
  PROVIDER_ESTIMATE: { label: "Provider estimate", tone: "bg-sand text-ink", title: "Supplied by a data provider; not independently checked." },
  HEURISTIC_ESTIMATE: { label: "Planning estimate", tone: "border border-border text-ink-soft", title: "A rule-of-thumb figure for planning. Not a quote or a live price." },
  USER_REPORTED: { label: "Traveller-reported", tone: "bg-sand text-ink", title: "Reported by a traveller; not independently checked." },
  USER_ENTERED: { label: "You entered", tone: "bg-terracotta/20 text-terracotta-deep", title: "An amount you recorded." },
};

function SourceBadge({ source }: { source: string }) {
  const s = SOURCE[source] ?? SOURCE.HEURISTIC_ESTIMATE;
  return <span title={s.title} className={cn("inline-flex h-5 items-center whitespace-nowrap rounded-full px-2 text-[10px] font-semibold uppercase tracking-[0.1em]", s.tone)}>{s.label}</span>;
}

const label = (category: string) => BUDGET_CATEGORIES.find((c) => c.value === category)?.label ?? category;

export function BudgetPanel({ tripId, initial, days, canEdit, travellers }: {
  tripId: string;
  initial: BudgetData;
  days: { index: number; date: string }[];
  canEdit: boolean;
  travellers: number;
}) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budgetInput, setBudgetInput] = useState(initial.summary.totalBudgetPaise === null ? "" : String(initial.summary.totalBudgetPaise / 100));
  const s = data.summary;

  async function run(fn: () => Promise<BudgetData>) {
    setBusy(true);
    setError(null);
    try {
      setData(await fn());
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const tiles: [string, string, string?][] = [
    ["Estimated", inr(s.estimatedPaise), "Sum of the lines below"],
    ["Spent so far", inr(s.actualPaise), "What you have recorded"],
    ["Left vs estimate", s.remainingVsEstimatePaise === null ? "—" : inr(s.remainingVsEstimatePaise), s.overBudget ? "Plan is over budget" : "Budget minus estimate"],
    ["Left vs spending", s.remainingVsActualPaise === null ? "—" : inr(s.remainingVsActualPaise), "Budget minus recorded spending"],
    ["Per person", inr(s.perPersonEstimatedPaise), `${travellers} ${travellers === 1 ? "traveller" : "travellers"}`],
    ["Per day", inr(s.perDayEstimatedPaise), `${days.length} ${days.length === 1 ? "day" : "days"}`],
  ];
  const max = Math.max(1, ...s.categories.map((c) => Math.max(c.estimatedPaise, c.actualPaise)));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {error && <p role="alert" className="mb-6 border-l-4 border-destructive bg-paper px-4 py-3 text-sm font-medium text-destructive">{error}</p>}

      <section aria-labelledby="total-heading" className="grid gap-6 border border-border bg-paper p-6 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <h2 id="total-heading" className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Total budget</h2>
          <p className="mt-1 font-serif text-5xl tabular">{s.totalBudgetPaise === null ? "Not set" : inr(s.totalBudgetPaise)}</p>
        </div>
        {canEdit && (
          <form className="flex items-end gap-2" onSubmit={async (e) => {
            e.preventDefault();
            const rupees = Number(budgetInput);
            if (budgetInput.trim() === "" || !Number.isInteger(rupees) || rupees < 0) return setError("Enter the budget as a whole number of rupees.");
            await run(async () => {
              await api(`/api/trips/${tripId}`, { method: "PATCH", body: { totalBudgetRupees: rupees } });
              return api<BudgetData>(`/api/trips/${tripId}/budget`);
            });
          }}>
            <div className="space-y-1.5">
              <Label htmlFor="total-budget">Change budget (₹)</Label>
              <Input id="total-budget" inputMode="numeric" value={budgetInput} onChange={(e) => setBudgetInput(e.target.value.replace(/[^0-9]/g, ""))} className="h-10 w-40 bg-cream" />
            </div>
            <button type="submit" disabled={busy} className={pill("outline", "sm", "h-10")}>Update</button>
          </form>
        )}
      </section>

      {s.overBudget && (
        <div role="alert" className="mt-4 border-l-4 border-terracotta bg-paper px-4 py-3 text-sm">
          <p className="font-semibold">The estimate is {inr(Math.abs(s.remainingVsEstimatePaise ?? 0))} over your budget.</p>
          {data.alternatives.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-ink-soft">
              {data.alternatives.map((a) => <li key={a.kind}>{a.message} <span className="tabular">({inr(a.estimatedPaise)})</span></li>)}
            </ul>
          )}
        </div>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden border border-border bg-border lg:grid-cols-6">
        {tiles.map(([k, v, hint], i) => (
          <div key={k} className="bg-paper p-4">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-soft">{k}</dt>
            <dd className={cn("mt-1 font-serif text-2xl tabular", i === 2 && s.overBudget && "text-destructive")}>{v}</dd>
            {hint && <dd className="mt-0.5 text-[11px] text-ink-soft">{hint}</dd>}
          </div>
        ))}
      </dl>

      {!data.hasItinerary && <p className="mt-6 text-sm text-ink-soft">Estimates appear once this trip has an itinerary.</p>}

      <section aria-labelledby="cat-heading" className="mt-10">
        <h2 id="cat-heading" className="text-3xl">By category</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/20 text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                <th scope="col" className="py-2 pr-4 font-semibold">Category</th>
                <th scope="col" className="w-[38%] py-2 pr-4 font-semibold">Estimate vs spent</th>
                <th scope="col" className="py-2 pr-4 text-right font-semibold">Estimated</th>
                <th scope="col" className="py-2 text-right font-semibold">Spent</th>
              </tr>
            </thead>
            <tbody>
              {s.categories.map((c) => (
                <tr key={c.category} className="border-b border-border">
                  <th scope="row" className="py-3 pr-4 font-medium">{label(c.category)}</th>
                  <td className="py-3 pr-4">
                    <div className="space-y-1" aria-hidden>
                      <div className="h-1.5 bg-sand-soft"><div className="h-full bg-forest" style={{ width: `${(c.estimatedPaise / max) * 100}%` }} /></div>
                      <div className="h-1.5 bg-sand-soft"><div className="h-full bg-terracotta" style={{ width: `${(c.actualPaise / max) * 100}%` }} /></div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right tabular">{c.unavailable ? <span className="text-xs italic text-ink-soft">Not available</span> : inr(c.estimatedPaise)}</td>
                  <td className="py-3 text-right tabular">{inr(c.actualPaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 flex gap-4 text-xs text-ink-soft"><span><span className="mr-1.5 inline-block size-2 bg-forest" />Estimated</span><span><span className="mr-1.5 inline-block size-2 bg-terracotta" />Spent</span></p>
      </section>

      <div className="mt-12 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="est-heading">
          <h2 id="est-heading" className="text-3xl">Where the estimate comes from</h2>
          <p className="mt-2 text-sm text-ink-soft">Every line shows its source. Planning estimates are rules of thumb, not quotes.</p>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {data.estimates.map((e) => (
              <li key={e.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 py-3 text-sm">
                <span className="font-medium">{label(e.category)}{e.dayIndex !== null && <span className="font-normal text-ink-soft"> · Day {e.dayIndex + 1}</span>}</span>
                <span className="text-right font-semibold tabular">{inr(e.amountPaise)}</span>
                <span className="text-xs text-ink-soft">{e.notes}</span>
                <span className="text-right"><SourceBadge source={e.source} /></span>
              </li>
            ))}
            {data.estimates.length === 0 && <li className="py-3 text-sm text-ink-soft">No estimates yet.</li>}
          </ul>
          {data.unavailable.length > 0 && (
            <details className="mt-4 border border-border bg-paper">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">Not included — information unavailable ({data.unavailable.length})</summary>
              <ul className="divide-y divide-border border-t border-border">
                {data.unavailable.map((u, i) => (
                  <li key={i} className="px-4 py-2.5 text-sm"><span className="font-medium">{label(u.category)}:</span> <span className="text-ink-soft">{u.reason}</span></li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section aria-labelledby="act-heading">
          <h2 id="act-heading" className="text-3xl">What you have actually spent</h2>
          <p className="mt-2 text-sm text-ink-soft">Kept separate from estimates, so you can always compare plan and reality.</p>
          {canEdit && (
            <form className="mt-4 grid gap-3 border border-border bg-paper p-4 sm:grid-cols-2" onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const fd = new FormData(form);
              const amount = Number(fd.get("amount"));
              if (!Number.isFinite(amount) || amount <= 0) return setError("Enter an amount greater than zero.");
              const dayIndex = fd.get("day") === "" ? undefined : Number(fd.get("day"));
              const ok = await run(() => api<BudgetData>(`/api/trips/${tripId}/expenses`, {
                method: "POST",
                body: {
                  category: fd.get("category"), amountRupees: amount,
                  spentAt: dayIndex !== undefined ? days[dayIndex].date : new Date().toISOString().slice(0, 10),
                  note: String(fd.get("note") ?? "").trim() || undefined, dayIndex,
                },
              }));
              if (ok) form.reset();
            }}>
              <div className="space-y-1.5">
                <Label htmlFor="exp-category">Category</Label>
                <select id="exp-category" name="category" className="h-10 w-full rounded-md border border-input bg-cream px-2 text-sm">
                  {BUDGET_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-amount">Amount (₹)</Label>
                <Input id="exp-amount" name="amount" type="number" min="0.01" step="0.01" required className="h-10 bg-cream" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-day">Day</Label>
                <select id="exp-day" name="day" className="h-10 w-full rounded-md border border-input bg-cream px-2 text-sm">
                  <option value="">Not tied to a day</option>
                  {days.map((d) => <option key={d.index} value={d.index}>Day {d.index + 1} · {longDate(d.date)}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-note">Note</Label>
                <Input id="exp-note" name="note" maxLength={300} className="h-10 bg-cream" />
              </div>
              <button type="submit" disabled={busy} className={pill("primary", "sm", "sm:col-span-2 sm:justify-self-start")}>{busy ? "Saving…" : "Record expense"}</button>
            </form>
          )}
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {data.actuals.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{label(a.category)}{a.dayIndex !== null && <span className="font-normal text-ink-soft"> · Day {a.dayIndex + 1}</span>}</span>
                  {a.note && <span className="block truncate text-xs text-ink-soft">{a.note}</span>}
                </span>
                <SourceBadge source="USER_ENTERED" />
                <span className="font-semibold tabular">{inr(a.amountPaise)}</span>
                {canEdit && (
                  <button type="button" disabled={busy} aria-label={`Delete ${label(a.category)} expense of ${inr(a.amountPaise)}`} className="inline-flex size-8 items-center justify-center rounded-full text-ink-soft hover:bg-sand-soft hover:text-destructive"
                    onClick={() => run(() => api<BudgetData>(`/api/trips/${tripId}/expenses/${a.id}`, { method: "DELETE" }))}>
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
            {data.actuals.length === 0 && <li className="py-3 text-sm text-ink-soft">Nothing recorded yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
