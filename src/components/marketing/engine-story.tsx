import { Reveal } from "@/components/motion/reveal";

const STEPS = [
  {
    n: "01",
    title: "It starts with you, not a template",
    body: "Dates, budget, pace, who is travelling and what you actually enjoy. Every place is scored against that — and you can see the reasons behind each score.",
  },
  {
    n: "02",
    title: "Days are drawn on the map first",
    body: "Places are grouped by where they are, so a morning in the old city is not followed by a fort twenty kilometres away and a market back where you began.",
  },
  {
    n: "03",
    title: "Time is treated as real",
    body: "Travel between stops, visit lengths, a proper lunch, and opening hours wherever we know them. If a day cannot work, the engine says so instead of pretending.",
  },
  {
    n: "04",
    title: "Money is arithmetic, not vibes",
    body: "Estimates are added up in exact rupees and labelled by where they came from. What we do not know is shown as unknown — never invented.",
  },
];

export function EngineStory() {
  return (
    <section className="bg-forest py-28 text-cream">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.35fr] lg:gap-24">
          <Reveal className="lg:sticky lg:top-32 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-terracotta">Not another chatbot</p>
            <h2 className="mt-4 text-5xl leading-[1.02] sm:text-6xl">
              A planner that does the <span className="italic text-sand">sums</span>.
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-cream/75">
              Most AI itineraries are a confident paragraph. Ours is a schedule: computed, checked
              against the clock and the budget, and only then put into words.
            </p>
          </Reveal>
          <ol className="divide-y divide-cream/15 border-y border-cream/15">
            {STEPS.map((s, i) => (
              <li key={s.n}>
                <Reveal delay={i * 0.05} className="grid gap-3 py-9 sm:grid-cols-[5rem_1fr]">
                  <span className="font-serif text-4xl text-terracotta">{s.n}</span>
                  <div>
                    <h3 className="text-3xl">{s.title}</h3>
                    <p className="mt-3 max-w-xl text-base leading-relaxed text-cream/75">{s.body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
