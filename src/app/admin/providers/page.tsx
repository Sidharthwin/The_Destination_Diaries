import type { Metadata } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { daysAgo } from "@/lib/utils/time";
import { prisma } from "@/server/db/prisma";
import { getLlmProvider } from "@/server/providers/llm";
import { getRoutingProvider } from "@/server/providers/routing";

export const metadata: Metadata = { title: "Providers" };

export default async function AdminProvidersPage() {
  const week = daysAgo(7);
  const [usage, errors, generation] = await Promise.all([
    prisma.providerUsageLog.groupBy({
      by: ["provider", "status"],
      where: { createdAt: { gte: week } },
      _count: true,
      _avg: { latencyMs: true },
    }),
    prisma.providerUsageLog.findMany({ where: { status: { not: "ok" } }, orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.generationLog.groupBy({ by: ["stage", "ok"], where: { createdAt: { gte: week } }, _count: true, _avg: { durationMs: true } }),
  ]);
  const providers = [...new Set(usage.map((u) => u.provider))].sort();
  // Only whether a key is present is shown — never the key itself.
  const config: [string, boolean, string][] = [
    ["Supabase Auth", isSupabaseConfigured(), "Accounts, Google sign-in"],
    ["Mapbox map display", Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN), "Without it, maps fall back to a schematic view"],
    ["Mapbox Directions", getRoutingProvider() !== null, "Without it, travel times are labelled estimates"],
    ["AI provider", getLlmProvider() !== null, "Without it, summaries use plain deterministic text"],
  ];
  const stages = [...new Set(generation.map((g) => g.stage))];

  return (
    <>
      <h1 className="text-5xl">Providers</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">Third-party services the product depends on. Every one is optional except the database: the planner degrades to labelled estimates rather than failing.</p>

      <h2 className="mt-8 text-3xl">Configuration</h2>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {config.map(([name, on, hint]) => (
          <li key={name} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
            <span><strong>{name}</strong> <span className="text-ink-soft">· {hint}</span></span>
            <span className={on ? "font-semibold text-forest" : "font-semibold text-terracotta-deep"}>{on ? "Configured" : "Not configured"}</span>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-3xl">Calls in the last 7 days</h2>
      {providers.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">No provider calls recorded yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto border border-border bg-paper">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead><tr className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-ink-soft">
              {["Provider", "OK", "Errors", "Rate limited", "Avg latency"].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {providers.map((p) => {
                const rows = usage.filter((u) => u.provider === p);
                const n = (s: string) => rows.find((r) => r.status === s)?._count ?? 0;
                const total = rows.reduce((a, r) => a + r._count, 0);
                const avg = rows.reduce((a, r) => a + (r._avg.latencyMs ?? 0) * r._count, 0) / Math.max(1, total);
                return (
                  <tr key={p} className="border-b border-border last:border-0">
                    <th scope="row" className="px-3 py-2.5 font-medium">{p}</th>
                    <td className="px-3 py-2.5 tabular">{n("ok")}</td>
                    <td className={`px-3 py-2.5 tabular ${n("error") ? "font-semibold text-destructive" : ""}`}>{n("error")}</td>
                    <td className="px-3 py-2.5 tabular">{n("rate_limited")}</td>
                    <td className="px-3 py-2.5 tabular">{Math.round(avg)} ms</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-10 text-3xl">Itinerary generation (7 days)</h2>
      {stages.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">No itineraries generated yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {stages.map((stage) => {
            const ok = generation.find((g) => g.stage === stage && g.ok);
            const bad = generation.find((g) => g.stage === stage && !g.ok);
            return (
              <li key={stage} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
                <strong className="capitalize">{stage}</strong>
                <span className="tabular text-ink-soft">{ok?._count ?? 0} ok · <span className={bad ? "font-semibold text-destructive" : ""}>{bad?._count ?? 0} failed</span> · avg {Math.round(ok?._avg.durationMs ?? 0)} ms</span>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mt-10 text-3xl">Recent errors</h2>
      {errors.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">No provider errors recorded.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {errors.map((e) => (
            <li key={e.id} className="py-3 text-sm">
              <strong>{e.provider}</strong> · {e.operation} · <span className="text-destructive">{e.status}{e.errorCode ? ` (${e.errorCode})` : ""}</span>
              <span className="block text-xs text-ink-soft">{e.createdAt.toLocaleString("en-IN")} · {e.latencyMs} ms</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
