"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/** `reducedMotion="user"` disables transform/layout animation for people who ask for less motion. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
