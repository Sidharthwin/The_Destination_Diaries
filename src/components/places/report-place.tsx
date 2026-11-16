"use client";

import { useState } from "react";
import { ApiError, api } from "@/lib/api-client";

/** Lets a signed-in traveller flag a problem with a place for admin review. */
export function ReportPlace({ placeId }: { placeId: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "sent") return <p role="status" className="text-sm text-forest">Thanks — our team will review this.</p>;
  if (!open) {
    return <button type="button" className="text-xs font-semibold text-ink-soft underline underline-offset-4 hover:text-ink" onClick={() => setOpen(true)}>Report a problem with this place</button>;
  }
  return (
    <form className="space-y-2 border border-border p-3" onSubmit={async (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const detail = String(fd.get("detail") ?? "").trim();
      if (detail.length < 5) return setError("Please describe the problem.");
      setState("sending");
      setError(null);
      try {
        await api(`/api/places/${placeId}/report`, { method: "POST", body: { kind: fd.get("kind"), detail } });
        setState("sent");
      } catch (err) {
        setState("idle");
        setError(err instanceof ApiError ? err.message : "Could not send the report.");
      }
    }}>
      <label className="block text-xs font-semibold">What is wrong?
        <select name="kind" className="mt-1 block h-9 w-full rounded-md border border-input bg-cream px-2 text-sm font-normal">
          <option value="CLOSED">It is closed</option>
          <option value="WRONG_INFO">Information is wrong</option>
          <option value="DUPLICATE">It is a duplicate</option>
          <option value="INAPPROPRIATE">It should not be listed</option>
          <option value="OTHER">Something else</option>
        </select>
      </label>
      <label className="block text-xs font-semibold">Details
        <textarea name="detail" rows={2} maxLength={2000} className="mt-1 block w-full rounded-md border border-input bg-cream p-2 text-sm font-normal" />
      </label>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={state === "sending"} className="h-8 rounded-full bg-forest px-4 text-xs font-semibold text-cream">{state === "sending" ? "Sending…" : "Send report"}</button>
        <button type="button" className="text-xs font-semibold underline underline-offset-4" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
