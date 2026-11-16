"use client";

import { BookOpen, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { pill } from "@/components/layout/button-link";
import { diaryStats } from "@/lib/diary/paginate";
import { SAMPLE_DIARIES } from "@/lib/diary/samples";
import { useDiaryStore } from "@/lib/diary/store";
import { BookThumb } from "./book-thumb";

function Plank() {
  return <div aria-hidden className="h-4 rounded-sm bg-gradient-to-b from-[#b08a5a] to-[#7d5f3b] shadow-[0_10px_18px_-8px_rgba(0,0,0,0.45)]" />;
}

export function Shelf() {
  const { ready, diaries, error } = useDiaryStore();
  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">My diaries</p>
          <h1 className="mt-3 text-5xl sm:text-7xl">Your <span className="italic">shelf</span></h1>
        </div>
        <Link href="/diaries/new" className={pill("primary", "md")}><Plus aria-hidden className="size-4" /> Start a new diary</Link>
      </div>
      {error && <p role="alert" className="mt-6 border-l-2 border-destructive bg-paper px-4 py-3 text-sm text-destructive">{error}</p>}

      <section aria-label="Your diaries" className="mt-12">
        <ul className="grid grid-cols-2 items-end gap-x-8 gap-y-0 px-4 sm:grid-cols-3 lg:grid-cols-5">
          <li className="pb-3">
            <Link href="/diaries/new" className="flex aspect-[3/4] flex-col items-center justify-center gap-3 border-2 border-dashed border-ink/25 text-ink-soft transition-colors hover:border-forest hover:text-forest">
              <Plus aria-hidden className="size-8" strokeWidth={1.25} />
              <span className="hand text-2xl">a new diary</span>
            </Link>
          </li>
          {diaries.map((d) => (
            <li key={d.id} className="pb-3">
              <Link href={`/diaries/${d.id}`} aria-label={`Open ${d.title || "untitled diary"}`}><BookThumb diary={d} /></Link>
            </li>
          ))}
        </ul>
        <Plank />
        {!ready ? (
          <p className="mt-6 text-sm text-ink-soft" aria-busy="true">Looking along the shelf…</p>
        ) : diaries.length === 0 ? (
          <p className="mt-6 max-w-xl text-ink-soft">
            Nothing here yet. A diary takes a title and a few photographs to begin — the chapters can come later.
            Diaries are saved in this browser, on this device.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-border border-y border-border">
            {diaries.map((d) => {
              const s = diaryStats(d);
              return (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-serif text-2xl leading-tight">{d.title || "Untitled diary"}</p>
                    <p className="text-xs text-ink-soft">{d.destination || "No destination yet"} · {s.chapters} {s.chapters === 1 ? "chapter" : "chapters"} · {s.photos} photos · edited {new Date(d.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/diaries/${d.id}`} className={pill("outline", "sm")}><Pencil aria-hidden className="size-3.5" /> Edit</Link>
                    <Link href={`/diaries/${d.id}/read`} className={pill("primary", "sm")}><BookOpen aria-hidden className="size-3.5" /> Read</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="samples-heading" className="mt-20">
        <p className="kicker">For inspiration</p>
        <h2 id="samples-heading" className="mt-3 text-4xl">From our shelf</h2>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">Example diaries made by our team, one in each of three styles. Open one to see what a finished book looks like.</p>
        <ul className="mt-8 grid grid-cols-2 items-end gap-x-8 px-4 sm:grid-cols-3 lg:grid-cols-5">
          {SAMPLE_DIARIES.map((d) => (
            <li key={d.id} className="pb-3">
              <Link href={`/diary/${d.slug}`} aria-label={`Read the sample diary ${d.title}`}><BookThumb diary={d} /></Link>
            </li>
          ))}
        </ul>
        <Plank />
      </section>
    </div>
  );
}
