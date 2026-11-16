"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { DiaryPhoto } from "@/components/diary/diary-photo";
import { pill } from "@/components/layout/button-link";
import { Reveal } from "@/components/motion/reveal";
import type { PhotoRef } from "@/lib/diary/types";

export interface LooseItem {
  photo: PhotoRef;
  note: string;
  chapter: number;
}

// Where each card lies when "loose": offsets in % of its own size, plus a tilt.
const SCATTER = [
  { x: 55, y: 70, r: -11 }, { x: -70, y: -20, r: 8 }, { x: 95, y: -75, r: 14 },
  { x: -35, y: 85, r: -6 }, { x: -120, y: -95, r: 10 }, { x: 20, y: -30, r: -15 },
];

/** Loose photographs and notes slide into chapters — the product in one gesture. */
export function LooseToChapters({ items, chapters }: { items: LooseItem[]; chapters: string[] }) {
  const [sorted, setSorted] = useState(false);
  return (
    <section className="overflow-hidden py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1fr_1.35fr]">
        <Reveal>
          <p className="kicker">From camera roll to chapters</p>
          <h2 className="mt-4 text-5xl leading-[1.02] sm:text-6xl">You bring the <span className="italic">mess</span>. We help you find the story.</h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-ink-soft">
            Drop in the photographs. Name the days that mattered. Add the line you scribbled on a
            ticket stub. Each memory finds its page.
          </p>
          <button type="button" aria-pressed={sorted} onClick={() => setSorted((s) => !s)} className={pill("primary", "md", "mt-8")}>
            {sorted ? "Shuffle them again" : "Sort into chapters"}
          </button>
        </Reveal>

        <motion.div
          className="grid gap-x-6 gap-y-7 sm:grid-cols-3"
          onViewportEnter={() => setSorted(true)}
          viewport={{ once: true, amount: 0.2 }}
        >
          {chapters.map((title, c) => (
            <div key={title}>
              <motion.p
                animate={{ opacity: sorted ? 1 : 0, y: sorted ? 0 : 8 }}
                transition={{ duration: 0.5, delay: sorted ? 0.5 + c * 0.1 : 0 }}
                className="mb-4 border-b border-ink/20 pb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-terracotta-deep"
              >
                Chapter {String(c + 1).padStart(2, "0")} <span className="mt-1 block font-serif text-2xl normal-case tracking-normal text-ink">{title}</span>
              </motion.p>
              <div className="space-y-5">
                {items.map((item, i) => item.chapter !== c ? null : (
                  <motion.figure
                    key={item.photo.id}
                    animate={sorted ? { x: "0%", y: "0%", rotate: i % 2 ? 1.2 : -1.2 } : { x: `${SCATTER[i % 6].x}%`, y: `${SCATTER[i % 6].y}%`, rotate: SCATTER[i % 6].r }}
                    transition={{ type: "spring", stiffness: 70, damping: 16, delay: sorted ? i * 0.07 : 0 }}
                    whileHover={{ scale: 1.04, rotate: 0 }}
                    style={{ zIndex: sorted ? 1 : 6 - i }}
                    className="relative bg-[#fdfbf5] p-2.5 pb-2 paper-shadow"
                  >
                    <DiaryPhoto photo={item.photo} alt={item.photo.caption} className="aspect-[4/3] w-full" />
                    <figcaption className="hand px-1 pt-2 text-center text-xl leading-tight text-ink">{item.note}</figcaption>
                  </motion.figure>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
