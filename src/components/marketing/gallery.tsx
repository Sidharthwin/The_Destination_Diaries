"use client";

import { ArrowUpRight } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/components/motion/use-reduced-motion";

export interface GalleryItem {
  slug: string;
  name: string;
  state: string;
  description: string | null;
  image: string | null;
  placeCount: number;
}

function Card({ item, index }: { item: GalleryItem; index: number }) {
  return (
    <Link
      href={`/destinations/${item.slug}`}
      className="group relative block w-[78vw] shrink-0 snap-start sm:w-[46vw] lg:w-[30rem]"
    >
      <div className={`relative overflow-hidden bg-sand ${index % 2 === 0 ? "aspect-[4/5]" : "aspect-[4/4.2] lg:mt-16"}`}>
        {item.image && (
          <Image
            src={item.image}
            alt={`${item.name}, ${item.state}`}
            fill
            sizes="(min-width: 1024px) 30rem, 78vw"
            className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <span className="absolute left-5 top-5 font-serif text-lg text-cream">{String(index + 1).padStart(2, "0")}</span>
        <span className="absolute bottom-5 right-5 inline-flex size-11 items-center justify-center rounded-full bg-cream text-forest transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1">
          <ArrowUpRight aria-hidden className="size-5" />
        </span>
      </div>
      <div className="mt-5 flex items-baseline justify-between gap-4">
        <h3 className="text-4xl">{item.name}</h3>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">{item.state}</span>
      </div>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">{item.description}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-terracotta-deep">{item.placeCount} places to plan with</p>
    </Link>
  );
}

/**
 * Desktop: vertical scroll drives the row sideways (sticky + translateX).
 * Touch / narrow screens / reduced motion: a native, snap-scrolling row.
 */
export function DestinationGallery({ items }: { items: GalleryItem[] }) {
  const reduce = usePrefersReducedMotion();
  const wrap = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const measure = () => {
      const wide = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
      setPinned(wide && !reduce);
      if (track.current) setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [reduce, items.length]);

  const { scrollYProgress } = useScroll({ target: wrap, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);

  const heading = (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="eyebrow">Where to next</p>
        <h2 className="mt-3 text-5xl sm:text-6xl">Five corners of a <span className="italic">very</span> large country</h2>
      </div>
      <Link href="/explore" className="text-sm font-semibold text-forest underline underline-offset-4">See everything we cover</Link>
    </div>
  );

  if (!pinned) {
    return (
      <section ref={wrap} className="py-24">
        {heading}
        <div className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto px-5 pb-4 sm:px-8">
          {items.map((item, i) => <Card key={item.slug} item={item} index={i} />)}
        </div>
      </section>
    );
  }

  return (
    <section ref={wrap} style={{ height: `calc(100vh + ${distance}px)` }} className="relative">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden pt-16">
        {heading}
        <motion.div ref={track} style={{ x }} className="mt-10 flex w-max gap-10 pl-[max(2rem,calc((100vw-80rem)/2+2rem))] pr-24 will-change-transform">
          {items.map((item, i) => <Card key={item.slug} item={item} index={i} />)}
        </motion.div>
      </div>
    </section>
  );
}
