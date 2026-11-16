"use client";

import { animate, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "./use-reduced-motion";

/** Animates a number towards `value` whenever it changes or first scrolls into view. */
export function Counter({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = usePrefersReducedMotion();
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(from.current, value, {
      duration: reduce ? 0 : 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShown(v),
    });
    from.current = value;
    return () => controls.stop();
  }, [value, inView, reduce]);

  return (
    <span ref={ref} className="tabular">
      {format(Math.round(shown))}
    </span>
  );
}
