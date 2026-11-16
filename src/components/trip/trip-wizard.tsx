"use client";

import { ArrowLeft, ArrowRight, Check, Minus, Plus } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { pill } from "@/components/layout/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ACCOMMODATION_PREFS, INTERESTS, TRANSPORT_PREFS, TRAVEL_STYLES } from "@/lib/constants/travel";
import { dateRangeLabel, inr } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export interface WizardDestination {
  id: string;
  slug: string;
  name: string;
  state: string;
  description: string | null;
  heroImageUrl: string | null;
  placeCount: number;
}

export interface WizardValues {
  destinationCityId: string;
  startDate: string;
  endDate: string;
  travellers: number;
  totalBudgetRupees: string;
  travelStyle: string;
  interests: string[];
  transportPref: string;
  accommodationPref: string;
  specialRequirements: string;
  title: string;
}

const STEPS = [
  "Destination", "Dates", "Travellers", "Budget", "Travel style", "Interests",
  "Getting around", "Where you stay", "Special requests", "Review",
] as const;

const STORAGE_KEY = "dd-trip-wizard";
const MAX_DAYS = 21;

function dayCount(v: WizardValues): number {
  if (!v.startDate || !v.endDate) return 0;
  return Math.round((Date.parse(v.endDate) - Date.parse(v.startDate)) / 86_400_000) + 1;
}

interface WizardProps {
  destinations: WizardDestination[];
  initial: WizardValues;
  draftId: string | null;
  today: string;
}

/** Unsaved progress for brand-new trips (server drafts load from the database). */
function restore(initial: WizardValues, draftId: string | null): { values: WizardValues; step: number } {
  if (draftId) return { values: initial, step: 0 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { values: initial, step: 0 };
    const stored = JSON.parse(raw) as { values: WizardValues; step: number };
    return {
      // Explicit choices in the URL win over stored progress.
      values: {
        ...initial,
        ...stored.values,
        destinationCityId: initial.destinationCityId || stored.values.destinationCityId,
        travelStyle: initial.travelStyle || stored.values.travelStyle,
      },
      step: Math.min(Math.max(0, stored.step ?? 0), STEPS.length - 1),
    };
  } catch {
    // Corrupt or unavailable storage: start fresh.
    return { values: initial, step: 0 };
  }
}

const noopSubscribe = () => () => {};

/** Renders the wizard once the browser is available, so saved progress can be restored without a hydration mismatch. */
export function TripWizard(props: WizardProps) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return <div className="flex-1" aria-busy="true" />;
  return <WizardForm {...props} />;
}

function WizardForm({ destinations, initial, draftId, today }: WizardProps) {
  const router = useRouter();
  const [restored] = useState(() => restore(initial, draftId));
  const [v, setV] = useState(restored.values);
  const [step, setStep] = useState(restored.step);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"draft" | "generate" | null>(null);
  const [savedId, setSavedId] = useState(draftId);
  const [draftSaved, setDraftSaved] = useState(false);

  useEffect(() => {
    if (draftId) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ values: v, step }));
    } catch {
      // Storage full or blocked: nothing to do.
    }
  }, [v, step, draftId]);

  const set = <K extends keyof WizardValues>(k: K, value: WizardValues[K]) => {
    setV((prev) => ({ ...prev, [k]: value }));
    setError(null);
    setDraftSaved(false);
  };

  const destination = destinations.find((d) => d.id === v.destinationCityId);
  const days = dayCount(v);
  const budget = v.totalBudgetRupees.trim() === "" ? null : Number(v.totalBudgetRupees);
  const autoTitle = destination ? `${days > 0 ? `${days} ${days === 1 ? "day" : "days"} in ` : ""}${destination.name}` : "";
  const title = v.title.trim() || autoTitle;

  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? destinations.filter((d) => `${d.name} ${d.state}`.toLowerCase().includes(f)) : destinations;
  }, [destinations, filter]);

  function validate(s: number): string | null {
    switch (s) {
      case 0:
        return destination ? null : "Choose where you are going.";
      case 1:
        if (!v.startDate || !v.endDate) return "Pick both a start and an end date.";
        if (v.startDate < today) return "The start date is in the past.";
        if (v.endDate < v.startDate) return "The end date must be on or after the start date.";
        if (days > MAX_DAYS) return `We can plan trips of up to ${MAX_DAYS} days for now.`;
        return null;
      case 2:
        return v.travellers >= 1 && v.travellers <= 20 ? null : "Travellers must be between 1 and 20.";
      case 3:
        if (budget === null) return null;
        if (!Number.isFinite(budget) || budget < 0 || !Number.isInteger(budget)) return "Enter the budget as a whole number of rupees.";
        if (budget > 100_000_000) return "That budget is larger than we can handle.";
        return null;
      default:
        return null;
    }
  }

  const firstInvalid = () => [0, 1, 2, 3].find((s) => validate(s) !== null);

  function next() {
    const problem = validate(step);
    if (problem) return setError(problem);
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function payload() {
    return {
      title,
      destinationCityId: v.destinationCityId,
      startDate: v.startDate,
      endDate: v.endDate,
      travellers: v.travellers,
      ...(budget !== null ? { totalBudgetRupees: budget } : {}),
      ...(v.travelStyle ? { travelStyle: v.travelStyle } : {}),
      interests: v.interests,
      ...(v.transportPref ? { transportPref: v.transportPref } : {}),
      ...(v.accommodationPref ? { accommodationPref: v.accommodationPref } : {}),
      specialRequirements: v.specialRequirements.trim(),
    };
  }

  async function save(): Promise<string> {
    const res = savedId
      ? await fetch(`/api/trips/${savedId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload()) })
      : await fetch("/api/trips", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload(), isDraft: true }) });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error?.message ?? "We could not save this trip.");
    const id = savedId ?? (json.data.id as string);
    setSavedId(id);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return id;
  }

  async function saveDraft() {
    const bad = [0, 1].find((s) => validate(s) !== null);
    if (bad !== undefined) {
      setStep(bad);
      return setError(`To save a draft we need a destination and dates. ${validate(bad)}`);
    }
    setBusy("draft");
    setError(null);
    try {
      const id = await save();
      setDraftSaved(true);
      if (!draftId) window.history.replaceState(null, "", `/trips/new?draft=${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not save this draft.");
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    const bad = firstInvalid();
    if (bad !== undefined) {
      setStep(bad);
      return setError(validate(bad));
    }
    setBusy("generate");
    setError(null);
    try {
      const id = await save();
      router.push(`/trips/${id}/generating`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not save this trip.");
      setBusy(null);
    }
  }

  const option = (on: boolean) =>
    cn("flex w-full items-start gap-3 border px-5 py-4 text-left transition-colors",
      on ? "border-forest bg-forest text-cream" : "border-border bg-paper hover:border-forest");
  const chip = (on: boolean) =>
    cn("h-11 rounded-full border px-5 text-sm font-semibold transition-colors",
      on ? "border-forest bg-forest text-cream" : "border-border bg-paper hover:border-forest");

  const summary: [string, string, number][] = [
    ["Destination", destination ? `${destination.name}, ${destination.state}` : "Not chosen", 0],
    ["Dates", v.startDate && v.endDate && days > 0 ? `${dateRangeLabel(v.startDate, v.endDate)} · ${days} ${days === 1 ? "day" : "days"}` : "Not set", 1],
    ["Travellers", String(v.travellers), 2],
    ["Budget", budget === null ? "No budget set" : inr(budget * 100), 3],
    ["Travel style", TRAVEL_STYLES.find((s) => s.value === v.travelStyle)?.label ?? "No preference", 4],
    ["Interests", v.interests.length ? v.interests.map((i) => INTERESTS.find((x) => x.slug === i)?.label).join(", ") : "Open to anything", 5],
    ["Getting around", TRANSPORT_PREFS.find((s) => s.value === v.transportPref)?.label ?? "No preference", 6],
    ["Stay", ACCOMMODATION_PREFS.find((s) => s.value === v.accommodationPref)?.label ?? "Matched to your style", 7],
    ["Special requests", v.specialRequirements.trim() || "None", 8],
  ];

  return (
    <div className="mx-auto grid w-full max-w-7xl flex-1 gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16 lg:py-14">
      <nav aria-label="Steps" className="lg:sticky lg:top-28 lg:self-start">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft lg:hidden">
          Step {step + 1} of {STEPS.length} · {STEPS[step]}
        </p>
        <div className="mt-3 h-1 bg-sand-soft lg:hidden" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1}>
          <div className="h-full bg-terracotta transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <ol className="hidden space-y-1 lg:block">
          {STEPS.map((label, i) => {
            const done = i < step;
            return (
              <li key={label}>
                <button
                  type="button"
                  aria-current={i === step ? "step" : undefined}
                  onClick={() => {
                    // Moving forward requires the steps in between to be valid.
                    const blocker = Array.from({ length: Math.max(0, i - step) }, (_, k) => step + k).find((s) => validate(s) !== null);
                    if (blocker !== undefined) {
                      setStep(blocker);
                      setError(validate(blocker));
                    } else {
                      setError(null);
                      setStep(i);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-full px-3 py-2 text-left text-sm transition-colors",
                    i === step ? "bg-sand-soft font-semibold text-ink" : "text-ink-soft hover:text-ink",
                  )}
                >
                  <span className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tabular",
                    done ? "border-forest bg-forest text-cream" : i === step ? "border-terracotta text-terracotta-deep" : "border-border")}>
                    {done ? <Check aria-hidden className="size-3.5" /> : i + 1}
                  </span>
                  {label}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <form
        className="flex min-h-[32rem] flex-col"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step === STEPS.length - 1) void generate();
          else next();
        }}
      >
        <div className="flex-1">
          {step === 0 && (
            <fieldset>
              <legend className="text-4xl sm:text-5xl">Where are you headed?</legend>
              <p className="mt-3 text-ink-soft">These are the destinations we can plan today. More are being added.</p>
              <Label htmlFor="dest-filter" className="sr-only">Filter destinations</Label>
              <Input id="dest-filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name or state" className="mt-6 h-11 max-w-sm bg-paper" />
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {shown.map((d) => {
                  const on = d.id === v.destinationCityId;
                  return (
                    <button key={d.id} type="button" aria-pressed={on} onClick={() => set("destinationCityId", d.id)}
                      className={cn("group relative overflow-hidden border text-left transition-colors", on ? "border-forest ring-2 ring-forest" : "border-border hover:border-forest")}>
                      <span className="relative block aspect-[16/10] bg-sand">
                        {d.heroImageUrl && <Image src={d.heroImageUrl} alt="" fill sizes="(min-width:1280px) 20rem, 50vw" className="object-cover" />}
                        {on && <span className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-full bg-forest text-cream"><Check aria-hidden className="size-4" /></span>}
                      </span>
                      <span className="block bg-paper p-4">
                        <span className="block font-serif text-2xl">{d.name}</span>
                        <span className="mt-0.5 block text-xs uppercase tracking-[0.16em] text-ink-soft">{d.state} · {d.placeCount} places</span>
                      </span>
                    </button>
                  );
                })}
                {shown.length === 0 && <p className="text-sm text-ink-soft">No destination matches “{filter}”.</p>}
              </div>
            </fieldset>
          )}

          {step === 1 && (
            <fieldset>
              <legend className="text-4xl sm:text-5xl">When are you going?</legend>
              <p className="mt-3 text-ink-soft">Dates matter: some places close on particular weekdays.</p>
              <div className="mt-8 grid max-w-xl gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">First day</Label>
                  <Input id="startDate" type="date" min={today} value={v.startDate}
                    onChange={(e) => {
                      const start = e.target.value;
                      setV((p) => ({ ...p, startDate: start, endDate: p.endDate && p.endDate >= start ? p.endDate : start }));
                      setError(null);
                    }} className="h-12 bg-paper" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Last day</Label>
                  <Input id="endDate" type="date" min={v.startDate || today} value={v.endDate} onChange={(e) => set("endDate", e.target.value)} className="h-12 bg-paper" />
                </div>
              </div>
              {days > 0 && days <= MAX_DAYS && <p className="mt-5 font-serif text-2xl" aria-live="polite">{days} {days === 1 ? "day" : "days"}{days > 1 ? `, ${days - 1} ${days === 2 ? "night" : "nights"}` : " — a day trip"}</p>}
            </fieldset>
          )}

          {step === 2 && (
            <fieldset>
              <legend className="text-4xl sm:text-5xl">How many of you?</legend>
              <p className="mt-3 text-ink-soft">Used for rooms, vehicles and per-person costs.</p>
              <div className="mt-8 flex items-center gap-6">
                <button type="button" aria-label="One fewer traveller" disabled={v.travellers <= 1} onClick={() => set("travellers", v.travellers - 1)} className="inline-flex size-12 items-center justify-center rounded-full border border-border bg-paper hover:border-forest disabled:opacity-40"><Minus className="size-5" /></button>
                <output aria-live="polite" className="w-20 text-center font-serif text-7xl tabular">{v.travellers}</output>
                <button type="button" aria-label="One more traveller" disabled={v.travellers >= 20} onClick={() => set("travellers", v.travellers + 1)} className="inline-flex size-12 items-center justify-center rounded-full border border-border bg-paper hover:border-forest disabled:opacity-40"><Plus className="size-5" /></button>
              </div>
            </fieldset>
          )}

          {step === 3 && (
            <fieldset>
              <legend className="text-4xl sm:text-5xl">What is the total budget?</legend>
              <p className="mt-3 max-w-xl text-ink-soft">For everyone, for the whole trip at the destination. Leave it blank to plan without a limit — you will still see estimates.</p>
              <div className="mt-8 max-w-sm space-y-2">
                <Label htmlFor="budget">Total budget in rupees</Label>
                <div className="flex items-center border border-input bg-paper">
                  <span aria-hidden className="pl-4 font-serif text-2xl text-ink-soft">₹</span>
                  <input id="budget" inputMode="numeric" pattern="[0-9]*" value={v.totalBudgetRupees}
                    onChange={(e) => set("totalBudgetRupees", e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g. 40000" className="h-14 w-full bg-transparent px-3 font-serif text-3xl outline-none placeholder:text-ink-soft/50" />
                </div>
                {budget !== null && budget > 0 && days > 0 && (
                  <p className="text-sm text-ink-soft" aria-live="polite">
                    About {inr(Math.round((budget * 100) / v.travellers))} per person, {inr(Math.round((budget * 100) / days))} per day.
                  </p>
                )}
              </div>
            </fieldset>
          )}

          {step === 4 && (
            <fieldset>
              <legend className="text-4xl sm:text-5xl">How do you like to travel?</legend>
              <p className="mt-3 text-ink-soft">Shapes the pace of each day, which places rise to the top, and budget assumptions. Optional.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {TRAVEL_STYLES.map((s) => {
                  const on = v.travelStyle === s.value;
                  return (
                    <button key={s.value} type="button" aria-pressed={on} onClick={() => set("travelStyle", on ? "" : s.value)} className={option(on)}>
                      <span>
                        <span className="block font-serif text-2xl">{s.label}</span>
                        <span className={cn("mt-1 block text-sm", on ? "text-cream/80" : "text-ink-soft")}>{s.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {step === 5 && (
            <fieldset>
              <legend className="text-4xl sm:text-5xl">What are you into?</legend>
              <p className="mt-3 text-ink-soft">Pick as many as you like. Leave empty if you are open to anything.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {INTERESTS.map((i) => {
                  const on = v.interests.includes(i.slug);
                  return (
                    <button key={i.slug} type="button" aria-pressed={on} className={chip(on)}
                      onClick={() => set("interests", on ? v.interests.filter((x) => x !== i.slug) : [...v.interests, i.slug])}>
                      {i.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {step === 6 && (
            <fieldset>
              <legend className="text-4xl sm:text-5xl">How will you get around?</legend>
              <p className="mt-3 text-ink-soft">Affects travel-time estimates and local transport costs. Optional.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {TRANSPORT_PREFS.map((t) => {
                  const on = v.transportPref === t.value;
                  return <button key={t.value} type="button" aria-pressed={on} className={chip(on)} onClick={() => set("transportPref", on ? "" : t.value)}>{t.label}</button>;
                })}
              </div>
            </fieldset>
          )}

          {step === 7 && (
            <fieldset>
              <legend className="text-4xl sm:text-5xl">Where do you like to stay?</legend>
              <p className="mt-3 max-w-xl text-ink-soft">Used only for a planning estimate of accommodation cost — we do not check availability or prices. Optional.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {ACCOMMODATION_PREFS.map((a) => {
                  const on = v.accommodationPref === a.value;
                  return <button key={a.value} type="button" aria-pressed={on} className={chip(on)} onClick={() => set("accommodationPref", on ? "" : a.value)}>{a.label}</button>;
                })}
              </div>
            </fieldset>
          )}

          {step === 8 && (
            <fieldset>
              <legend className="text-4xl sm:text-5xl">Anything we should know?</legend>
              <p className="mt-3 max-w-xl text-ink-soft">Mobility needs, travelling with children or elders, things to avoid. Optional — saved with your trip, and interpreted when AI assistance is enabled.</p>
              <Label htmlFor="special" className="sr-only">Special requirements</Label>
              <Textarea id="special" rows={6} maxLength={2000} value={v.specialRequirements} onChange={(e) => set("specialRequirements", e.target.value)}
                placeholder="e.g. Travelling with my parents, so a gentle pace and not too many stairs." className="mt-8 max-w-2xl bg-paper text-base" />
              <p className="mt-2 text-xs text-ink-soft">{v.specialRequirements.length}/2000</p>
            </fieldset>
          )}

          {step === 9 && (
            <section aria-labelledby="review-heading">
              <h2 id="review-heading" className="text-4xl sm:text-5xl">Ready when you are</h2>
              <p className="mt-3 text-ink-soft">Check the details, then we will build your itinerary. You can change anything afterwards.</p>
              <div className="mt-8 max-w-xl space-y-2">
                <Label htmlFor="title">Trip name</Label>
                <Input id="title" value={v.title} onChange={(e) => set("title", e.target.value)} placeholder={autoTitle} maxLength={120} className="h-12 bg-paper font-serif text-xl" />
              </div>
              <dl className="mt-8 max-w-2xl divide-y divide-border border-y border-border">
                {summary.map(([label, value, target]) => (
                  <div key={label} className="grid grid-cols-[8.5rem_1fr_auto] items-baseline gap-4 py-3.5">
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">{label}</dt>
                    <dd className="text-sm">{value}</dd>
                    <button type="button" onClick={() => setStep(target)} className="text-xs font-semibold text-forest underline underline-offset-4" aria-label={`Edit ${label}`}>Edit</button>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        <div className="mt-10">
          {error && <p role="alert" className="mb-4 text-sm font-medium text-destructive">{error}</p>}
          {draftSaved && !error && <p role="status" className="mb-4 text-sm text-forest">Draft saved. You will find it under My trips.</p>}
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
            <button type="button" disabled={step === 0 || busy !== null} onClick={() => { setError(null); setStep((s) => Math.max(0, s - 1)); }} className={pill("outline", "md")}>
              <ArrowLeft aria-hidden className="size-4" /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button type="submit" disabled={busy !== null} className={pill("primary", "md")}>
                Continue <ArrowRight aria-hidden className="size-4" />
              </button>
            ) : (
              <button type="submit" disabled={busy !== null} className={pill("accent", "md")}>
                {busy === "generate" ? "Saving…" : "Build my itinerary"} <ArrowRight aria-hidden className="size-4" />
              </button>
            )}
            <button type="button" disabled={busy !== null} onClick={saveDraft} className="ml-auto text-sm font-semibold text-forest underline underline-offset-4 disabled:opacity-50">
              {busy === "draft" ? "Saving draft…" : "Save draft"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
