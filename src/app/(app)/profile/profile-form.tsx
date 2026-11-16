"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { pill } from "@/components/layout/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INTERESTS, TRAVEL_STYLES } from "@/lib/constants/travel";
import { cn } from "@/lib/utils";

interface Values {
  displayName: string;
  homeCity: string;
  travelStyle: string;
  interests: string[];
  dietary: string;
  pacePreference: string;
}

export function ProfileForm({ initial }: { initial: Values }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Values>(k: K, value: Values[K]) => {
    setV((prev) => ({ ...prev, [k]: value }));
    setState("idle");
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!v.displayName.trim()) return setError("Please enter a name.");
    setState("saving");
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        displayName: v.displayName.trim(),
        homeCity: v.homeCity.trim() || null,
        travelStyle: v.travelStyle || null,
        interests: v.interests,
        dietary: v.dietary.trim() || null,
        pacePreference: v.pacePreference || null,
      }),
    });
    if (res.ok) {
      setState("saved");
      router.refresh();
    } else {
      setState("idle");
      setError("We could not save your profile. Please try again.");
    }
  }

  const chip = (on: boolean) =>
    cn("h-9 rounded-full border px-4 text-xs font-semibold transition-colors", on ? "border-forest bg-forest text-cream" : "border-border hover:border-forest");

  return (
    <form onSubmit={onSubmit} className="mt-10 space-y-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="displayName">Name</Label>
          <Input id="displayName" value={v.displayName} onChange={(e) => set("displayName", e.target.value)} maxLength={80} className="h-11 bg-paper" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="homeCity">Home city <span className="font-normal text-ink-soft">(optional)</span></Label>
          <Input id="homeCity" value={v.homeCity} onChange={(e) => set("homeCity", e.target.value)} maxLength={80} className="h-11 bg-paper" />
        </div>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Usual travel style</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {TRAVEL_STYLES.map((s) => (
            <button key={s.value} type="button" aria-pressed={v.travelStyle === s.value} onClick={() => set("travelStyle", v.travelStyle === s.value ? "" : s.value)} className={chip(v.travelStyle === s.value)}>{s.label}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">Interests</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {INTERESTS.map((i) => {
            const on = v.interests.includes(i.slug);
            return (
              <button key={i.slug} type="button" aria-pressed={on} onClick={() => set("interests", on ? v.interests.filter((x) => x !== i.slug) : [...v.interests, i.slug])} className={chip(on)}>{i.label}</button>
            );
          })}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">Preferred pace</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {[["relaxed", "Relaxed"], ["moderate", "Moderate"], ["packed", "Packed"]].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={v.pacePreference === value} onClick={() => set("pacePreference", v.pacePreference === value ? "" : value)} className={chip(v.pacePreference === value)}>{label}</button>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="dietary">Dietary notes <span className="font-normal text-ink-soft">(optional)</span></Label>
        <Input id="dietary" value={v.dietary} onChange={(e) => set("dietary", e.target.value)} maxLength={120} placeholder="e.g. vegetarian, no nuts" className="h-11 bg-paper" />
      </div>
      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
      <div className="flex items-center gap-4">
        <button type="submit" disabled={state === "saving"} className={pill("primary", "md")}>{state === "saving" ? "Saving…" : "Save profile"}</button>
        {state === "saved" && <span role="status" className="text-sm text-forest">Saved.</span>}
      </div>
    </form>
  );
}
