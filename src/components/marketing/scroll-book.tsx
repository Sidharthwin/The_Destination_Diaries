"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useMemo, useRef, useSyncExternalStore } from "react";
import { BookViewer } from "@/components/diary/book-viewer";
import { PageView } from "@/components/diary/page-view";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { paginate, type DiaryPage } from "@/lib/diary/paginate";
import type { Diary } from "@/lib/diary/types";

const PINNED = "(min-width: 1024px) and (pointer: fine)";
function subscribe(cb: () => void) {
  const mq = window.matchMedia(PINNED);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

const LEAVES = 5;

function Leaf({ i, progress, pages, diary }: { i: number; progress: MotionValue<number>; pages: DiaryPage[]; diary: Diary }) {
  // Each leaf turns during its own slice of the scroll.
  const start = 0.08 + (i / LEAVES) * 0.8;
  const end = start + 0.8 / LEAVES;
  const rotateY = useTransform(progress, [start, end], [0, -180], { clamp: true });
  const zIndex = useTransform(rotateY, (r) => (r < -90 ? i + 1 : LEAVES * 2 - i));
  return (
    <motion.div style={{ rotateY, zIndex }} className="absolute right-0 top-0 h-full w-1/2 origin-left [transform-style:preserve-3d]">
      <div className="absolute inset-0 overflow-hidden rounded-r-[3px] [backface-visibility:hidden]">
        <PageView page={pages[i * 2]} diary={diary} index={i * 2} side="right" />
      </div>
      <div className="absolute inset-0 overflow-hidden rounded-l-[3px] [backface-visibility:hidden] [transform:rotateY(180deg)]">
        <PageView page={pages[i * 2 + 1]} diary={diary} index={i * 2 + 1} side="left" />
      </div>
    </motion.div>
  );
}

/**
 * The signature moment: on desktop the section pins, and scrolling opens the
 * cover and turns the pages. On touch screens, or with reduced motion, it is
 * the ordinary interactive book instead.
 */
export function ScrollBook({ diary }: { diary: Diary }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = usePrefersReducedMotion();
  const fine = useSyncExternalStore(subscribe, () => window.matchMedia(PINNED).matches, () => false);
  const pinned = fine && !reduce;
  const pages = useMemo(() => paginate(diary), [diary]);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0.08, 0.24], ["-25%", "0%"]);
  const rise = useTransform(scrollYProgress, [0, 0.08], [0.9, 1]);
  const hint = useTransform(scrollYProgress, [0, 0.12], [1, 0]);

  const heading = (
    <div className="mx-auto max-w-3xl px-5 text-center">
      <p className="kicker justify-center text-sand before:bg-sand">The diary</p>
      <h2 className="mt-4 text-5xl leading-[1.02] text-cream sm:text-7xl">
        Not a feed. Not an album. <span className="italic text-sand">A book.</span>
      </h2>
    </div>
  );

  if (!pinned) {
    return (
      <section ref={ref} className="bg-[#1a2420] py-24 text-cream">
        {heading}
        <div className="mx-auto mt-12 max-w-6xl px-5"><BookViewer diary={diary} /></div>
      </section>
    );
  }

  return (
    <section ref={ref} className="relative h-[420vh] bg-[#1a2420]">
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden pt-16">
        {heading}
        <div className="mt-8 w-full" style={{ perspective: "2600px" }}>
          <motion.div style={{ x, scale: rise }} className="relative mx-auto aspect-[3/2] w-[min(86vw,calc((100vh-19rem)*1.5))]">
            <span aria-hidden className="absolute inset-x-[6%] -bottom-6 h-10 rounded-[50%] bg-black/40 blur-xl" />
            {/* The rest of the book, resting under the leaves that turn. */}
            {pages[LEAVES * 2] && (
              <div className="absolute right-0 top-0 h-full w-1/2 overflow-hidden rounded-r-[3px]">
                <PageView page={pages[LEAVES * 2]} diary={diary} index={LEAVES * 2} side="right" />
              </div>
            )}
            {Array.from({ length: LEAVES }, (_, i) => <Leaf key={i} i={i} progress={scrollYProgress} pages={pages} diary={diary} />)}
          </motion.div>
        </div>
        <motion.p style={{ opacity: hint }} className="hand mt-6 text-2xl text-sand">keep scrolling to turn the pages</motion.p>
      </div>
    </section>
  );
}
