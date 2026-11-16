"use client";

import { useState } from "react";
import { pill } from "@/components/layout/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TOPICS = ["A correction to place data", "A destination you should cover", "A problem with the site", "Something else"];

export function ContactForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    if (message.length < 10) {
      setError("Please write at least a sentence so we can help.");
      return;
    }
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic: String(form.get("topic")), message, ...(email ? { email } : {}) }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error?.code === "VALIDATION" ? "Please check your email address and message." : "We could not send your message.");
      }
      setState("sent");
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "We could not send your message. Please try again.");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="border border-border bg-paper p-8">
        <h2 className="text-3xl">Thank you — message received.</h2>
        <p className="mt-3 text-ink-soft">If you left an email address we will reply there.</p>
        <button type="button" className={pill("outline", "md", "mt-6")} onClick={() => setState("idle")}>Send another</button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="topic">What is this about?</Label>
        <select id="topic" name="topic" className="h-11 w-full rounded-md border border-input bg-paper px-3 text-sm">
          {TOPICS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email <span className="font-normal text-ink-soft">(optional, if you would like a reply)</span></Label>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={defaultEmail} className="h-11 bg-paper" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" rows={7} required maxLength={5000} className="bg-paper" aria-describedby={error ? "contact-error" : undefined} />
      </div>
      {error && <p id="contact-error" role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      <button type="submit" disabled={state === "sending"} className={pill("primary", "lg")}>
        {state === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
