"use client";

import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

export function SaveButton({ placeId, initialSaved, canSave }: { placeId: string; initialSaved: boolean; canSave: boolean }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);

  const toggle = () => {
    if (!canSave) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const next = !saved;
    setSaved(next);
    setError(false);
    start(async () => {
      const res = await fetch("/api/saved", {
        method: next ? "POST" : "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ placeId }),
      });
      if (!res.ok) {
        setSaved(!next);
        setError(true);
      } else router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved places" : "Save this place"}
      title={error ? "Could not update — try again" : saved ? "Saved" : "Save"}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors",
        saved ? "border-terracotta bg-terracotta text-ink" : "border-border text-ink-soft hover:border-forest hover:text-forest",
        error && "border-destructive",
      )}
    >
      <Bookmark aria-hidden className="size-4" fill={saved ? "currentColor" : "none"} />
    </button>
  );
}
