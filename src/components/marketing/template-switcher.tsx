"use client";

import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { PageView } from "@/components/diary/page-view";
import { ButtonLink } from "@/components/layout/button-link";
import { Reveal } from "@/components/motion/reveal";
import { paginate } from "@/lib/diary/paginate";
import { TEMPLATES } from "@/lib/diary/templates";
import type { Diary, TemplateId } from "@/lib/diary/types";
import { cn } from "@/lib/utils";

/** The same diary, re-dressed live in each of the five styles. */
export function TemplateSwitcher({ diary }: { diary: Diary }) {
  const [id, setId] = useState<TemplateId>("journal");
  const template = TEMPLATES.find((t) => t.id === id)!;
  const styled = useMemo(() => ({ ...diary, template: id }), [diary, id]);
  const spread = useMemo(() => {
    const pages = paginate(styled);
    const open = pages.findIndex((p) => p.kind === "chapter");
    return [pages[open + 1], pages[open]].map((page, k) => ({ page, index: open + 1 - k }));
  }, [styled]);

  return (
    <section className="border-y border-border bg-sand-soft py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="kicker">Five styles</p>
            <h2 className="mt-4 text-5xl leading-[1.02] sm:text-6xl">Same story, <span className="italic">different binding</span></h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-ink-soft lg:justify-self-end">
            Choose how your diary feels. Switch any time — your words and photographs re-flow into the new design.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <div role="radiogroup" aria-label="Diary style" className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {TEMPLATES.map((t) => (
              <button key={t.id} role="radio" aria-checked={t.id === id} onClick={() => setId(t.id)}
                className={cn("flex shrink-0 items-center gap-3 border px-4 py-3 text-left transition-colors lg:shrink", t.id === id ? "border-forest bg-paper" : "border-transparent hover:border-ink/20")}>
                <span aria-hidden className="h-10 w-7 shrink-0 rounded-r-sm shadow-sm" style={{ background: t.cover, borderRight: `6px solid ${t.paper}` }} />
                <span>
                  <span className="block font-serif text-2xl leading-none">{t.name}</span>
                  <span className="mt-1 hidden text-xs leading-snug text-ink-soft lg:block">{t.tagline}</span>
                </span>
              </button>
            ))}
          </div>

          <div>
            <div className="relative mx-auto aspect-[3/2] w-full max-w-4xl">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={id}
                  initial={{ opacity: 0, rotateX: -8, y: 24 }}
                  animate={{ opacity: 1, rotateX: 0, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 flex shadow-[0_40px_70px_-35px_rgba(0,0,0,0.55)]"
                >
                  {spread.map(({ page, index }, k) => (
                    <div key={k} className="h-full w-1/2 overflow-hidden"><PageView page={page} diary={styled} index={index} side={k === 0 ? "left" : "right"} /></div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
            <p aria-live="polite" className="mt-6 text-center text-sm text-ink-soft"><strong className="text-ink">{template.name}.</strong> {template.tagline}</p>
          </div>
        </div>
        <div className="mt-10 text-center"><ButtonLink href="/discover">See whole diaries in these styles</ButtonLink></div>
      </div>
    </section>
  );
}
