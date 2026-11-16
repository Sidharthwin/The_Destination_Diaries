"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { pill } from "@/components/layout/button-link";
import { cn } from "@/lib/utils";

const STAGES = [
  "Reading your preferences",
  "Gathering places nearby",
  "Scoring each place against your interests",
  "Grouping places into days by location",
  "Working out travel times and the daily schedule",
  "Checking the budget",
];

interface Failure {
  message: string;
  reasons: string[];
  alternatives: string[];
}

export function GeneratingClient({ tripId, destination, hasItinerary }: { tripId: string; destination: string; hasItinerary: boolean }) {
  const router = useRouter();
  const started = useRef(false);
  const [stage, setStage] = useState(0);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // The stage list is a calm progress indication; the request below is the real work.
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 650);
    return () => clearInterval(t);
  }, [attempt]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (hasItinerary) {
      router.replace(`/trips/${tripId}`);
      return;
    }
    (async () => {
      const began = Date.now();
      try {
        const res = await fetch(`/api/trips/${tripId}/generate`, { method: "POST" });
        const json = await res.json().catch(() => null);
        if (res.ok) {
          // Let the last stages tick over briefly so the screen does not flash.
          await new Promise((r) => setTimeout(r, Math.max(0, 1800 - (Date.now() - began))));
          setStage(STAGES.length);
          router.replace(`/trips/${tripId}`);
          return;
        }
        const details = json?.error?.details ?? {};
        setFailure({
          message: json?.error?.message ?? "Something went wrong while building your itinerary.",
          reasons: Array.isArray(details.reasons) ? details.reasons : [],
          alternatives: Array.isArray(details.alternatives) ? details.alternatives : [],
        });
      } catch {
        setFailure({ message: "We lost the connection while building your itinerary.", reasons: [], alternatives: ["Check your connection and try again."] });
      }
    })();
  }, [tripId, hasItinerary, router, attempt]);

  if (failure) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-16" role="alert">
        <p className="eyebrow">We could not finish</p>
        <h1 className="mt-3 text-5xl">{failure.message}</h1>
        {failure.reasons.length > 0 && (
          <>
            <h2 className="mt-8 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Why</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">{failure.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          </>
        )}
        {failure.alternatives.length > 0 && (
          <>
            <h2 className="mt-8 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">What you can do</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">{failure.alternatives.map((r) => <li key={r}>{r}</li>)}</ul>
          </>
        )}
        <div className="mt-10 flex flex-wrap gap-3">
          <button type="button" className={pill("primary", "md")} onClick={() => { started.current = false; setFailure(null); setStage(0); setAttempt((a) => a + 1); }}>Try again</button>
          <Link href={`/trips/new?draft=${tripId}`} className={pill("outline", "md")}>Change trip details</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-5 py-16">
      <p className="eyebrow">One moment</p>
      <h1 className="mt-3 text-5xl sm:text-6xl">Planning <span className="italic">{destination}</span>…</h1>
      <ol className="mt-10 space-y-4" aria-live="polite">
        {STAGES.map((label, i) => {
          const done = i < stage;
          const current = i === stage;
          return (
            <li key={label} className={cn("flex items-center gap-4 transition-opacity duration-500", i > stage ? "opacity-30" : "opacity-100")}>
              <span className={cn("inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-xs",
                done ? "border-forest bg-forest text-cream" : current ? "border-terracotta" : "border-border")}>
                {done ? <Check aria-hidden className="size-4" /> : current ? <span className="size-2 animate-pulse rounded-full bg-terracotta" /> : null}
              </span>
              <span className={cn("text-lg", current && "font-semibold")}>{label}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-10 text-sm text-ink-soft">This usually takes a few seconds.</p>
    </div>
  );
}
