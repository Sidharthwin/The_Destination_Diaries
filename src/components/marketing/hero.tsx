"use client";

import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { Fragment, useRef } from "react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";
import { ButtonLink } from "@/components/layout/button-link";

const LINES = [["Every", "journey", "deserves"], ["a", "book", "of", "its", "own."]];

export function Hero({ image, credit, signedIn }: { image: string; credit: string | null; signedIn: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  let word = 0;

  return (
    <section ref={ref} className="relative isolate flex min-h-svh flex-col justify-end overflow-hidden bg-forest text-cream">
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={reduce ? undefined : { y }}
        initial={{ scale: 1.12, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <Image src={image} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1f1a]/90 via-[#0d1f1a]/25 to-[#0d1f1a]/45" />
      </motion.div>

      <motion.div style={reduce ? undefined : { opacity: fade }} className="mx-auto w-full max-w-7xl px-5 pb-12 pt-36 sm:px-8 sm:pb-16">
        <motion.p
          className="text-xs font-semibold uppercase tracking-[0.28em] text-sand"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          Travel diaries · made in India
        </motion.p>
        <h1 className="mt-5 text-[clamp(2.75rem,7.4vw,6.75rem)] leading-[0.98]">
          {LINES.map((line, li) => (
            <span key={li} className="block overflow-hidden pb-[0.12em] lg:whitespace-nowrap">
              {line.map((w) => {
                const i = word++;
                return (
                  <Fragment key={w}>
                    <motion.span
                      className={`inline-block ${li === 1 ? "italic text-sand" : ""}`}
                      initial={{ y: "110%" }}
                      animate={{ y: 0 }}
                      transition={{ duration: 0.95, delay: 0.45 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {w}
                    </motion.span>{" "}
                  </Fragment>
                );
              })}
            </span>
          ))}
        </h1>
        <motion.div
          className="mt-10 grid items-end gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.05 }}
        >
          <div className="flex flex-wrap items-center gap-4">
            <ButtonLink href={signedIn ? "/diaries/new" : "/signup?next=/diaries/new"} variant="accent" size="lg">Start a diary</ButtonLink>
            <ButtonLink href="/diary/pink-city-slowly" variant="light" size="lg">Open a finished one</ButtonLink>
            <span className="hand hidden text-2xl text-sand sm:inline">scroll — it opens ↓</span>
          </div>
          <p className="max-w-md text-base leading-relaxed text-cream/85 lg:justify-self-end">
            Turn photographs and half-remembered days into a diary you can open, turn the pages of,
            and keep. Then plan the next trip with an engine that does the sums.
          </p>
        </motion.div>
      </motion.div>
      {credit && (
        <p className="absolute right-3 top-20 hidden max-w-[16rem] text-right text-[10px] leading-tight text-cream/50 lg:block">Photo: {credit}</p>
      )}
    </section>
  );
}
