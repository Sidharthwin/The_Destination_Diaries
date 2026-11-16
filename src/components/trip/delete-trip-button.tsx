"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteTripButton({ tripId, title }: { tripId: string; title: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-sm font-semibold text-ink-soft underline-offset-4 hover:text-destructive hover:underline">
        Delete
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-3 text-sm" role="group" aria-label={`Delete ${title}?`}>
      <span className="text-ink-soft">{error ? "Could not delete." : "Delete for good?"}</span>
      <button
        type="button"
        disabled={busy}
        className="font-semibold text-destructive underline underline-offset-4"
        onClick={async () => {
          setBusy(true);
          const res = await fetch(`/api/trips/${tripId}`, { method: "DELETE" });
          if (res.ok) router.refresh();
          else {
            setError(true);
            setBusy(false);
          }
        }}
      >
        {busy ? "Deleting…" : "Yes, delete"}
      </button>
      <button type="button" className="font-semibold underline underline-offset-4" onClick={() => setConfirming(false)}>Keep</button>
    </span>
  );
}
