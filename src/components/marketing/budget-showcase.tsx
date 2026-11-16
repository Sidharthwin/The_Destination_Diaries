"use client";

import { useMemo, useState } from "react";
import { Counter } from "@/components/motion/counter";
import { Reveal } from "@/components/motion/reveal";
import { BUDGET_CATEGORIES, TRAVEL_STYLES } from "@/lib/constants/travel";
import { inr } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { estimateTripCosts, summarizeBudget } from "@/server/services/budget/engine";

type Style = (typeof TRAVEL_STYLES)[number]["value"];

/** Runs the real budget engine in the browser with illustrative inputs. */
export function BudgetShowcase() {
  const [travellers, setTravellers] = useState(2);
  const [days, setDays] = useState(4);
  const [style, setStyle] = useState<Style>("CULTURAL");

  const summary = useMemo(() => {
    const { lines, unavailable } = estimateTripCosts({
      travellers,
      nights: days - 1,
      dayCount: days,
      travelStyle: style,
      accommodationPref: null,
      // Illustrative local travel: three short rides a day.
      legs: Array.from({ length: days * 3 }, (_, i) => ({ dayIndex: Math.floor(i / 3), mode: "AUTO" as const, distanceMeters: 4000 })),
      stops: [],
    });
    return summarizeBudget({
      totalBudgetPaise: null,
      travellers,
      dayCount: days,
      estimates: lines,
      actuals: [],
      unavailableCategories: unavailable.map((u) => u.category),
    });
  }, [travellers, days, style]);

  const total = Number(summary.estimatedPaise);
  const rows = summary.categories.filter((c) => c.estimatedPaise > 0n || c.unavailable);

  return (
    <section className="bg-sand-soft py-28">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[1fr_1.15fr] lg:gap-24">
        <Reveal>
          <p className="eyebrow">Budget, honestly</p>
          <h2 className="mt-3 text-5xl sm:text-6xl">Know the number <span className="italic">before</span> you go</h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-ink-soft">
            Move the controls. The figures are computed by the same engine that checks your real
            trip — in exact rupees, per person and per day.
          </p>

          <div className="mt-10 space-y-7">
            <label className="block">
              <span className="flex items-baseline justify-between text-sm font-semibold">
                Travellers <span className="font-serif text-2xl">{travellers}</span>
              </span>
              <input type="range" min={1} max={8} value={travellers} onChange={(e) => setTravellers(Number(e.target.value))} className="mt-2 w-full accent-forest" />
            </label>
            <label className="block">
              <span className="flex items-baseline justify-between text-sm font-semibold">
                Days <span className="font-serif text-2xl">{days}</span>
              </span>
              <input type="range" min={1} max={10} value={days} onChange={(e) => setDays(Number(e.target.value))} className="mt-2 w-full accent-forest" />
            </label>
            <fieldset>
              <legend className="text-sm font-semibold">Travel style</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {TRAVEL_STYLES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={style === s.value}
                    onClick={() => setStyle(s.value)}
                    className={cn(
                      "h-9 rounded-full border px-4 text-xs font-semibold transition-colors",
                      style === s.value ? "border-forest bg-forest text-cream" : "border-ink/20 hover:border-forest",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="self-start border border-border bg-paper p-7 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Estimated at the destination</p>
          <p className="mt-2 font-serif text-6xl leading-none sm:text-7xl" aria-live="polite">
            <Counter value={total} format={inr} />
          </p>
          <div className="mt-6 grid grid-cols-2 gap-6 border-y border-border py-5">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Per person</p>
              <p className="mt-1 font-serif text-3xl"><Counter value={Number(summary.perPersonEstimatedPaise)} format={inr} /></p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-ink-soft">Per day</p>
              <p className="mt-1 font-serif text-3xl"><Counter value={Number(summary.perDayEstimatedPaise)} format={inr} /></p>
            </div>
          </div>
          <ul className="mt-5 space-y-4">
            {rows.map((c) => {
              const amount = Number(c.estimatedPaise);
              const label = BUDGET_CATEGORIES.find((b) => b.value === c.category)?.label ?? c.category;
              return (
                <li key={c.category}>
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="font-medium">{label}</span>
                    {c.unavailable ? (
                      <span className="text-xs italic text-ink-soft">not estimated — you add this</span>
                    ) : (
                      <span className="tabular font-semibold">{inr(amount)}</span>
                    )}
                  </div>
                  {!c.unavailable && (
                    <div className="mt-1.5 h-1.5 bg-sand-soft">
                      <div className="h-full origin-left bg-forest transition-transform duration-700 ease-out" style={{ transform: `scaleX(${total ? amount / total : 0})` }} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-6 text-xs leading-relaxed text-ink-soft">
            Illustrative planning estimates, not quotes or live prices. On a real trip, entry fees are
            only counted where a price is on record, and your actual spending is tracked separately.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
