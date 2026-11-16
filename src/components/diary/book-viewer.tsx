"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { paginate } from "@/lib/diary/paginate";
import type { Diary } from "@/lib/diary/types";
import { cn } from "@/lib/utils";
import { PageView } from "./page-view";

const WIDE = "(min-width: 768px)";
function subscribeWide(cb: () => void) {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/**
 * The book. On wide screens: a two-page spread whose leaves turn in 3D (pure
 * CSS transforms). On phones: one page at a time. Arrow keys, on-screen
 * buttons and tapping either half of the book all turn pages.
 */
export function BookViewer({ diary, className }: { diary: Diary; className?: string }) {
  const pages = useMemo(() => paginate(diary), [diary]);
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => true);
  const leafCount = pages.length / 2;
  // `turned` = number of leaves flipped (wide) ; `single` = page index (narrow)
  const [turned, setTurned] = useState(0);
  const [single, setSingle] = useState(0);
  const [moving, setMoving] = useState<number | null>(null);

  const position = wide ? turned : single;
  const max = wide ? leafCount : pages.length - 1;

  const go = useCallback(
    (delta: number) => {
      if (wide) {
        setTurned((t) => {
          const next = Math.min(leafCount, Math.max(0, t + delta));
          if (next !== t) setMoving(delta > 0 ? t : next);
          return next;
        });
      } else {
        setSingle((s) => Math.min(pages.length - 1, Math.max(0, s + delta)));
      }
    },
    [wide, leafCount, pages.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const label = wide
    ? turned === 0 ? "Front cover" : turned === leafCount ? "Back cover" : `Pages ${turned * 2 - 1}–${turned * 2} of ${pages.length - 2}`
    : single === 0 ? "Front cover" : single === pages.length - 1 ? "Back cover" : `Page ${single} of ${pages.length - 2}`;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative w-full" style={{ perspective: "2600px" }}>
        {wide ? (
          <div
            className="relative mx-auto aspect-[3/2] w-[min(100%,calc((100svh-15rem)*1.5))] transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(${turned === 0 ? "-25%" : turned === leafCount ? "25%" : "0"})` }}
          >
            {/* soft shadow under the book */}
            <span aria-hidden className="absolute inset-x-[6%] -bottom-5 h-8 rounded-[50%] bg-black/25 blur-xl" />
            {Array.from({ length: leafCount }, (_, i) => {
              // Only leaves near the open spread need real content.
              const near = Math.abs(i - turned) <= 2 || i === 0 || i === leafCount - 1;
              const flipped = i < turned;
              return (
                <div
                  key={i}
                  className="absolute right-0 top-0 h-full w-1/2 origin-left transition-transform duration-[900ms] ease-[cubic-bezier(0.45,0.05,0.2,1)] [transform-style:preserve-3d] motion-reduce:transition-none"
                  style={{
                    transform: `rotateY(${flipped ? -180 : 0}deg)`,
                    zIndex: moving === i ? leafCount + 2 : flipped ? i : leafCount - i,
                  }}
                  onTransitionEnd={() => setMoving((m) => (m === i ? null : m))}
                >
                  <div className="absolute inset-0 overflow-hidden rounded-r-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] [backface-visibility:hidden]">
                    {near && <PageView page={pages[i * 2]} diary={diary} index={i * 2} side="right" />}
                  </div>
                  <div className="absolute inset-0 overflow-hidden rounded-l-[3px] shadow-[0_0_0_1px_rgba(0,0,0,0.08)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    {near && <PageView page={pages[i * 2 + 1]} diary={diary} index={i * 2 + 1} side="left" />}
                  </div>
                </div>
              );
            })}
            {/* tap zones */}
            <button type="button" aria-label="Previous page" disabled={turned === 0} onClick={() => go(-1)} className="absolute inset-y-0 left-0 z-[200] w-1/2 cursor-w-resize disabled:cursor-default" tabIndex={-1} />
            <button type="button" aria-label="Next page" disabled={turned === leafCount} onClick={() => go(1)} className="absolute inset-y-0 right-0 z-[200] w-1/2 cursor-e-resize disabled:cursor-default" tabIndex={-1} />
          </div>
        ) : (
          <div className="relative mx-auto aspect-[3/4] w-[min(100%,calc((100svh-14rem)*0.75))] overflow-hidden rounded-[3px] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]">
            <div key={single} className="absolute inset-0 animate-in fade-in duration-500">
              <PageView page={pages[single]} diary={diary} index={single} side={single % 2 ? "left" : "right"} />
            </div>
            <button type="button" aria-label="Previous page" disabled={single === 0} onClick={() => go(-1)} className="absolute inset-y-0 left-0 w-1/3" tabIndex={-1} />
            <button type="button" aria-label="Next page" disabled={single === pages.length - 1} onClick={() => go(1)} className="absolute inset-y-0 right-0 w-2/3" tabIndex={-1} />
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center gap-5">
        <button type="button" onClick={() => go(-1)} disabled={position === 0} aria-label="Turn back a page"
          className="inline-flex size-11 items-center justify-center rounded-full border border-current/25 transition-colors hover:bg-current/10 disabled:opacity-30">
          <ChevronLeft className="size-5" />
        </button>
        <p aria-live="polite" className="min-w-[11rem] text-center text-xs font-semibold uppercase tracking-[0.2em] opacity-75">{label}</p>
        <button type="button" onClick={() => go(1)} disabled={position === max} aria-label="Turn the page"
          className="inline-flex size-11 items-center justify-center rounded-full border border-current/25 transition-colors hover:bg-current/10 disabled:opacity-30">
          <ChevronRight className="size-5" />
        </button>
      </div>
      <p className="mt-3 hidden text-xs opacity-60 md:block">Click either page, or use the ← → keys</p>
    </div>
  );
}
