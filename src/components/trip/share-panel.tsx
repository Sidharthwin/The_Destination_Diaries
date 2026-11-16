"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { pill } from "@/components/layout/button-link";
import { ApiError, api } from "@/lib/api-client";

export function SharePanel({ tripId, initialEnabled, initialUrl, isOwner, hasItinerary }: {
  tripId: string;
  initialEnabled: boolean;
  initialUrl: string | null;
  isOwner: boolean;
  hasItinerary: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ shareEnabled: boolean; url: string | null }>(`/api/trips/${tripId}/share`, { method: "POST", body: { enabled: next } });
      setEnabled(res.shareEnabled);
      setUrl(res.url);
      setCopied(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update sharing.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h2 className="text-4xl">Share this trip</h2>
      <p className="mt-3 leading-relaxed text-ink-soft">
        Turn on a private link to let anyone who has it view the itinerary. They will see the stops,
        times and map — not your budget, your special requirements, or your account.
      </p>
      {!hasItinerary && <p className="mt-4 border-l-2 border-terracotta bg-paper px-4 py-3 text-sm">This trip has no itinerary yet, so a shared link would be empty.</p>}
      {error && <p role="alert" className="mt-4 text-sm font-medium text-destructive">{error}</p>}

      <div className="mt-8 border border-border bg-paper p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Link sharing is {enabled ? "on" : "off"}</p>
            <p className="text-sm text-ink-soft">{enabled ? "Anyone with the link can view." : "Only you can see this trip."}</p>
          </div>
          {isOwner ? (
            <button type="button" disabled={busy} onClick={() => toggle(!enabled)} className={pill(enabled ? "outline" : "primary", "md")} aria-pressed={enabled}>
              {busy ? "Saving…" : enabled ? "Turn off link" : "Turn on link"}
            </button>
          ) : (
            <p className="text-sm text-ink-soft">Only the trip owner can change sharing.</p>
          )}
        </div>
        {enabled && url && (
          <div className="mt-6 border-t border-border pt-6">
            <label htmlFor="share-url" className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">Share link</label>
            <div className="mt-2 flex gap-2">
              <input id="share-url" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="h-11 min-w-0 flex-1 rounded-md border border-input bg-cream px-3 text-sm" />
              <button
                type="button"
                className={pill("primary", "md")}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                  } catch {
                    setError("Copying is blocked by your browser — select the link and copy it manually.");
                  }
                }}
              >
                {copied ? <><Check aria-hidden className="size-4" /> Copied</> : <><Copy aria-hidden className="size-4" /> Copy</>}
              </button>
            </div>
            <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-forest underline underline-offset-4">Preview what others will see</a>
            <p className="mt-3 text-xs text-ink-soft">Turning the link off stops it working immediately. Turning it back on restores the same link.</p>
          </div>
        )}
      </div>
    </div>
  );
}
