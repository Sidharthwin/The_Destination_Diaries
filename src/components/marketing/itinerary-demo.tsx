"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { ButtonLink } from "@/components/layout/button-link";
import { RouteSketch } from "@/components/map/route-sketch";
import { Reveal } from "@/components/motion/reveal";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { KIND_LABELS, MODE_LABELS, clock, duration } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { SamplePlan } from "@/server/services/samples";

export function ItineraryDemo({ plans }: { plans: SamplePlan[] }) {
  const reduce = usePrefersReducedMotion();
  const [planIdx, setPlanIdx] = useState(0);
  const [dayIdx, setDayIdx] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const plan = plans[planIdx];
  const day = plan?.days[dayIdx] ?? plan?.days[0];
  const points = useMemo(
    () => (day?.stops ?? []).map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, label: s.name })),
    [day],
  );
  if (!plan || !day) return null;

  return (
    <section className="py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="max-w-3xl">
          <p className="eyebrow">See it think</p>
          <h2 className="mt-3 text-5xl sm:text-6xl">A weekend, worked out</h2>
          <p className="mt-5 text-base leading-relaxed text-ink-soft">
            These are live outputs of the planning engine for a culture-minded weekend — not a mock-up.
            Pick a place, switch days, and hover a stop to find it on the route.
          </p>
        </Reveal>

        <div className="mt-10 flex flex-wrap items-center gap-2" role="tablist" aria-label="Sample destination">
          {plans.map((p, i) => (
            <button
              key={p.slug}
              role="tab"
              aria-selected={i === planIdx}
              onClick={() => { setPlanIdx(i); setDayIdx(0); setActive(null); }}
              className={cn(
                "h-10 rounded-full border px-5 text-sm font-semibold transition-colors",
                i === planIdx ? "border-forest bg-forest text-cream" : "border-border text-ink hover:border-forest",
              )}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="mt-8 grid overflow-hidden border border-border bg-paper lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="p-6 sm:p-9">
            <div className="flex items-center justify-between gap-4 border-b border-border pb-5">
              <div role="tablist" aria-label="Day" className="flex gap-6">
                {plan.days.map((d, i) => (
                  <button
                    key={d.index}
                    role="tab"
                    aria-selected={i === dayIdx}
                    onClick={() => { setDayIdx(i); setActive(null); }}
                    className={cn(
                      "pb-1 font-serif text-2xl transition-colors",
                      i === dayIdx ? "border-b-2 border-terracotta text-ink" : "text-ink-soft hover:text-ink",
                    )}
                  >
                    Day {i + 1}
                  </button>
                ))}
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
                {day.stops.length} stops · {duration(day.travelMins)} travel
              </p>
            </div>
            <AnimatePresence mode="wait">
              <motion.ol
                key={`${plan.slug}-${dayIdx}`}
                className="mt-6"
                initial="hidden"
                animate="show"
                exit={reduce ? undefined : { opacity: 0 }}
                variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.07 } } }}
              >
                {day.stops.map((s, i) => (
                  <motion.li
                    key={s.id}
                    variants={{ hidden: { opacity: 0, x: -14 }, show: { opacity: 1, x: 0 } }}
                    transition={{ duration: 0.45, ease: "easeOut" }}
                    onMouseEnter={() => setActive(s.id)}
                    onMouseLeave={() => setActive(null)}
                    className="grid grid-cols-[4.75rem_1.25rem_1fr] gap-x-3"
                  >
                    <span className="pt-0.5 text-right text-sm font-semibold tabular text-ink-soft">{clock(s.arrivalMin)}</span>
                    <span className="flex flex-col items-center">
                      <span className={cn("mt-1.5 size-3 rounded-full border-2 transition-colors", active === s.id ? "border-terracotta bg-terracotta" : "border-forest bg-paper")} />
                      {i < day.stops.length - 1 && <span className="w-px flex-1 bg-border" />}
                    </span>
                    <div className="pb-6">
                      <p className={cn("font-semibold leading-snug transition-colors", active === s.id && "text-terracotta-deep")}>{s.name}</p>
                      <p className="mt-0.5 text-sm text-ink-soft">{KIND_LABELS[s.kind]} · {duration(s.visitDurationMins)}</p>
                      {s.legMins !== null && (
                        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-ink-soft/80">
                          {MODE_LABELS[s.legMode ?? "AUTO"]} · about {duration(s.legMins)}
                        </p>
                      )}
                    </div>
                  </motion.li>
                ))}
              </motion.ol>
            </AnimatePresence>
            <p className="border-t border-border pt-4 text-xs leading-relaxed text-ink-soft">
              Travel times are planning estimates. Opening hours are respected wherever they are on record.
            </p>
          </div>
          <div className="relative min-h-[22rem] border-t border-border lg:border-l lg:border-t-0">
            <RouteSketch points={points} activeId={active} onHover={setActive} className="absolute inset-0" />
            <p className="absolute bottom-3 left-4 text-[11px] uppercase tracking-[0.16em] text-ink-soft">Schematic route · {plan.name}, {plan.state}</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <ButtonLink href={`/trips/new?destination=${plan.slug}`}>Plan my own {plan.name} trip</ButtonLink>
          <ButtonLink href={`/destinations/${plan.slug}`} variant="quiet" className="px-0">Read about {plan.name}</ButtonLink>
        </div>
      </div>
    </section>
  );
}
