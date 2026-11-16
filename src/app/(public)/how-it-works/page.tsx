import type { Metadata } from "next";
import { ButtonLink } from "@/components/layout/button-link";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "How it works",
  description: "How Destination Diaries turns your preferences into a checked, day-by-day itinerary.",
};

const STAGES = [
  { title: "You answer ten short questions", body: "Destination, dates, travellers, budget, travel style, interests, how you like to get around, where you like to stay, and anything special we should know. You can save a draft at any point." },
  { title: "We gather candidate places", body: "Every active place within reach of your destination is considered. The same code runs for every destination — nothing is special-cased for any one city." },
  { title: "Each place is scored, and you can see why", body: "Interest match, fit with your travel style, the kind of place it is, and whether its details are verified. The score is a simple sum of those parts, shown on each stop." },
  { title: "Places are grouped into days by geography", body: "Nearby places are clustered together so each day stays in one part of town, then ordered to cut backtracking." },
  { title: "The clock is applied", body: "Travel time between stops, visit lengths, a lunch break, and opening hours where we have them. Stops that cannot fit are moved to another day or left out — with the reason recorded." },
  { title: "The budget is checked", body: "Costs are added in exact rupees. If the estimate exceeds your budget, you are told plainly and offered alternatives that have been checked to fit." },
  { title: "AI adds the words, not the numbers", body: "When enabled, an AI model writes the day summaries and interprets free-text requests. Its output is validated before use, and it never sets a time, a route or a price." },
  { title: "You edit, and it keeps up", body: "Reorder, remove, add, lengthen a visit, lock a favourite, or ask for a replan. Every change is saved, every replan is a new version, and nothing is lost." },
];

const HONESTY = [
  ["Heuristic, not optimal", "The planner uses practical heuristics. It produces sensible plans quickly; it does not claim the mathematically best possible route."],
  ["Estimates are labelled", "Travel times are planning estimates unless marked as measured. Cost lines show whether they are verified, estimated or entered by you."],
  ["Unknown stays unknown", "We do not invent opening hours, entry fees, ratings, hotel availability or fares. Where we have no data, we say so."],
  ["Coverage is growing", "We cover a small, representative set of destinations today. The data pipeline is built to expand across India as licensed data is added and verified."],
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        eyebrow="How it works"
        title={<>From a few answers to a plan that <span className="italic">adds up</span></>}
        intro="An itinerary is a scheduling problem with a human at the centre. Here is exactly what happens between your answers and your plan."
      />
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <ol className="grid gap-x-16 gap-y-14 md:grid-cols-2">
          {STAGES.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[3.5rem_1fr] gap-4 border-t border-ink/15 pt-6">
              <span className="font-serif text-4xl text-terracotta-deep">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h2 className="text-2xl leading-snug">{s.title}</h2>
                <p className="mt-3 leading-relaxed text-ink-soft">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <section className="bg-forest py-24 text-cream">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <h2 className="max-w-2xl text-5xl">What we promise, and what we do not</h2>
          <dl className="mt-12 grid gap-x-16 gap-y-10 md:grid-cols-2">
            {HONESTY.map(([t, b]) => (
              <div key={t} className="border-t border-cream/20 pt-5">
                <dt className="font-serif text-2xl text-sand">{t}</dt>
                <dd className="mt-2 leading-relaxed text-cream/80">{b}</dd>
              </div>
            ))}
          </dl>
          <ButtonLink href="/trips/new" variant="accent" size="lg" className="mt-14">Plan a trip</ButtonLink>
        </div>
      </section>
    </>
  );
}
