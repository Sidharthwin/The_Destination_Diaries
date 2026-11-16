"use client";

import { ArrowRight, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Results {
  cities: { id: string; name: string; slug: string; state: string }[];
  places: { id: string; name: string; city: { name: string; slug: string; state: string } }[];
}

/** Live search over the places API; Enter goes to the full Explore results. */
export function DestinationSearch({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/places/search?q=${encodeURIComponent(term)}&limit=5`, { signal: ctrl.signal });
        if (!res.ok) return;
        const json = await res.json();
        setResults(json.data);
        setOpen(true);
      } catch {
        // aborted or offline — keep the previous results
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Results only count while the query is long enough to have produced them.
  const shown = q.trim().length >= 2 ? results : null;
  const empty = shown && shown.cities.length === 0 && shown.places.length === 0;

  return (
    <form
      ref={box}
      role="search"
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q.trim() ? `/explore?q=${encodeURIComponent(q.trim())}` : "/explore");
      }}
    >
      <div
        className={cn(
          "flex h-16 items-center gap-3 rounded-full pl-6 pr-2 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.5)]",
          tone === "light" ? "bg-paper text-ink" : "border border-border bg-paper text-ink shadow-none",
        )}
      >
        <Search aria-hidden className="size-5 shrink-0 text-ink-soft" />
        <label htmlFor={`${listId}-input`} className="sr-only">Search destinations and places in India</label>
        <input
          id={`${listId}-input`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => shown && setOpen(true)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="Where in India? Try “Hampi” or “tea garden”"
          autoComplete="off"
          aria-controls={listId}
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-ink-soft/80"
        />
        <button
          type="submit"
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-forest px-5 text-sm font-semibold text-cream transition-colors hover:bg-forest-soft"
        >
          <span className="hidden sm:inline">Explore</span>
          <ArrowRight aria-hidden className="size-4" />
        </button>
      </div>
      {open && shown && (
        <div id={listId} className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-border bg-paper text-left text-ink shadow-xl">
          {empty ? (
            <p className="px-5 py-4 text-sm text-ink-soft">
              Nothing in our dataset matches “{q.trim()}” yet. <Link href="/explore" className="font-semibold text-forest underline underline-offset-2">Browse what we cover</Link>.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-2">
              {shown.cities.map((c) => (
                <li key={c.id}>
                  <Link href={`/destinations/${c.slug}`} className="flex items-center gap-3 px-5 py-3 hover:bg-sand-soft" onClick={() => setOpen(false)}>
                    <MapPin aria-hidden className="size-4 text-terracotta-deep" />
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-sm text-ink-soft">{c.state}</span>
                    <span className="ml-auto text-xs uppercase tracking-widest text-ink-soft">Destination</span>
                  </Link>
                </li>
              ))}
              {shown.places.map((p) => (
                <li key={p.id}>
                  <Link href={`/destinations/${p.city.slug}#place-${p.id}`} className="flex items-baseline gap-3 px-5 py-3 hover:bg-sand-soft" onClick={() => setOpen(false)}>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-sm text-ink-soft">{p.city.name}, {p.city.state}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
