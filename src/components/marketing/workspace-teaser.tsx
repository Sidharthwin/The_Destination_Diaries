import { GitBranch, Lock, RefreshCcw, Share2 } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";

const POINTS = [
  { icon: RefreshCcw, title: "Replan when life happens", body: "Something closed, the budget shrank, you want slower days — the engine rebuilds around what you already decided." },
  { icon: Lock, title: "Lock what matters", body: "Pin the stops you will not give up. Replanning works around them." },
  { icon: GitBranch, title: "Every version kept", body: "Each plan and replan is saved. Compare them, and go back any time." },
  { icon: Share2, title: "Share a read-only link", body: "Send the plan to your fellow travellers without sharing your account or your budget." },
];

export function WorkspaceTeaser() {
  return (
    <section className="border-y border-border bg-paper py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="max-w-3xl">
          <p className="eyebrow">Your trip workspace</p>
          <h2 className="mt-3 text-5xl sm:text-6xl">A plan is a draft. <span className="italic">Edit it.</span></h2>
        </Reveal>
        <div className="mt-14 grid gap-x-14 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.06}>
              <p.icon aria-hidden className="size-6 text-terracotta-deep" strokeWidth={1.5} />
              <h3 className="mt-5 text-2xl">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
