import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { TRAVEL_STYLES } from "@/lib/constants/travel";

export function TravelStyles() {
  return (
    <section className="py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow">Travel your way</p>
            <h2 className="mt-3 text-5xl sm:text-6xl">Seven ways to see the same place</h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-ink-soft lg:justify-self-end">
            Style changes what gets chosen, how long the days run and what the budget assumes. Start
            with one — you can change it later and replan.
          </p>
        </Reveal>
        <ul className="mt-14 border-t border-ink/15">
          {TRAVEL_STYLES.map((s, i) => (
            <li key={s.value}>
              <Reveal delay={i * 0.03} y={16}>
                <Link
                  href={`/trips/new?style=${s.value}`}
                  className="group grid items-baseline gap-2 border-b border-ink/15 py-6 transition-colors hover:bg-sand-soft sm:grid-cols-[4rem_minmax(0,1fr)_minmax(0,1.4fr)_2.5rem] sm:px-4"
                >
                  <span className="text-xs font-semibold tabular tracking-[0.2em] text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-serif text-4xl transition-transform duration-300 group-hover:translate-x-2 sm:text-5xl">{s.label}</span>
                  <span className="text-base text-ink-soft">{s.description}</span>
                  <ArrowRight aria-hidden className="hidden size-5 justify-self-end text-terracotta-deep opacity-0 transition-opacity group-hover:opacity-100 sm:block" />
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
