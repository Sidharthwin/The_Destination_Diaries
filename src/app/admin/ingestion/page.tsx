import type { Metadata } from "next";
import { titleCase } from "@/lib/utils/format";
import { prisma } from "@/server/db/prisma";
import { listPlaceProviders } from "@/server/providers/places";
import { retryJob, startIngestion } from "../actions";

export const metadata: Metadata = { title: "Ingestion" };

export default async function AdminIngestionPage({ searchParams }: PageProps<"/admin/ingestion">) {
  const sp = await searchParams;
  const [jobs, cities] = await Promise.all([
    prisma.ingestionJob.findMany({ orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.city.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const providers = listPlaceProviders();
  const tone: Record<string, string> = { SUCCEEDED: "text-forest", FAILED: "text-destructive", RUNNING: "text-terracotta-deep", PENDING: "text-ink-soft" };

  return (
    <>
      <h1 className="text-5xl">Ingestion</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Imports run through provider adapters, are de-duplicated against existing places, and always arrive unverified with their licence and attribution recorded.
      </p>
      {typeof sp.error === "string" && <p role="alert" className="mt-4 border-l-2 border-destructive bg-paper px-4 py-3 text-sm text-destructive">{sp.error}</p>}

      <form action={startIngestion} className="mt-8 flex flex-wrap items-end gap-3 border border-border bg-paper p-5">
        <label className="text-sm font-medium">Provider
          <select name="provider" className="mt-1.5 block h-10 rounded-md border border-input bg-cream px-2 text-sm">
            {providers.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">City
          <select name="cityId" className="mt-1.5 block h-10 rounded-md border border-input bg-cream px-2 text-sm">
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <button type="submit" className="h-10 rounded-full bg-forest px-5 text-sm font-semibold text-cream">Run import</button>
        <p className="basis-full text-xs text-ink-soft">
          {providers.map((p) => `${p.label}: ${p.attribution} (${p.licence})`).join(" · ")}. OpenStreetMap imports call the public Overpass API — run them sparingly.
        </p>
      </form>

      <h2 className="mt-10 text-3xl">Jobs</h2>
      <div className="mt-4 overflow-x-auto border border-border bg-paper">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-ink-soft">
              {["Started", "Provider", "Region", "Status", "Fetched", "New", "Updated", "Merged", ""].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-semibold">{h || <span className="sr-only">Actions</span>}</th>)}
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => {
              const s = (j.stats ?? {}) as Record<string, number>;
              return (
                <tr key={j.id} className="border-b border-border align-top last:border-0">
                  <td className="px-3 py-2.5 tabular">{(j.startedAt ?? j.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</td>
                  <td className="px-3 py-2.5">{j.provider}</td>
                  <td className="px-3 py-2.5">{j.regionRef}</td>
                  <td className={`px-3 py-2.5 font-semibold ${tone[j.status]}`}>
                    {titleCase(j.status)}
                    {j.error && <span className="block max-w-xs text-xs font-normal">{j.error}</span>}
                  </td>
                  <td className="px-3 py-2.5 tabular">{s.fetched ?? "—"}</td>
                  <td className="px-3 py-2.5 tabular">{s.created ?? "—"}</td>
                  <td className="px-3 py-2.5 tabular">{s.updated ?? "—"}</td>
                  <td className="px-3 py-2.5 tabular">{s.skipped ?? "—"}</td>
                  <td className="px-3 py-2.5 text-right">
                    {j.status === "FAILED" && j.regionRef.startsWith("city:") && (
                      <form action={retryJob}><input type="hidden" name="id" value={j.id} /><button type="submit" className="font-semibold text-forest underline underline-offset-4">Retry</button></form>
                    )}
                  </td>
                </tr>
              );
            })}
            {jobs.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-ink-soft">No imports have run yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
