import type { Metadata } from "next";
import Link from "next/link";
import { titleCase } from "@/lib/utils/format";
import { prisma } from "@/server/db/prisma";
import { resolveReport } from "../../actions";

export const metadata: Metadata = { title: "Review queue" };

export default async function AdminReviewPage() {
  const [reports, unverified, recent] = await Promise.all([
    prisma.placeReport.findMany({
      where: { status: { in: ["OPEN", "REVIEWING"] } },
      include: { place: { include: { city: true } }, reporter: { select: { email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.place.count({ where: { isActive: true, verificationStatus: "UNVERIFIED" } }),
    prisma.placeReport.findMany({
      where: { status: { in: ["RESOLVED", "REJECTED"] } },
      include: { place: true },
      orderBy: { updatedAt: "desc" },
      take: 8,
    }),
  ]);
  return (
    <>
      <h1 className="text-5xl">Review queue</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Reports from travellers. Fix the place if the report is right, then resolve it.{" "}
        <Link href="/admin/places?status=UNVERIFIED" className="font-semibold text-forest underline underline-offset-2">{unverified} places</Link> are still unverified.
      </p>
      <h2 className="mt-8 text-3xl">Open reports ({reports.length})</h2>
      {reports.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">Nothing waiting. Travellers can report a place from its listing or by contacting us.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {reports.map((r) => (
            <li key={r.id} className="border border-border bg-paper p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  <span className="mr-2 rounded-full bg-terracotta/20 px-2.5 py-0.5 text-[11px] uppercase tracking-[0.12em] text-terracotta-deep">{titleCase(r.kind)}</span>
                  <Link href={`/admin/places/${r.placeId}`} className="text-forest underline underline-offset-4">{r.place.name}</Link>
                  <span className="font-normal text-ink-soft"> · {r.place.city.name}</span>
                </p>
                <p className="text-xs text-ink-soft">{r.reporter?.email ?? "Anonymous"} · {r.createdAt.toLocaleDateString("en-IN")} · {titleCase(r.status)}</p>
              </div>
              <p className="mt-3 text-sm leading-relaxed">{r.detail}</p>
              <form action={resolveReport} className="mt-4 flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={r.id} />
                <label className="min-w-0 flex-1 text-sm font-medium">Resolution note
                  <input name="resolutionNote" maxLength={1000} className="mt-1.5 block h-10 w-full rounded-md border border-input bg-cream px-3 text-sm font-normal" />
                </label>
                <button name="status" value="RESOLVED" className="h-10 rounded-full bg-forest px-5 text-sm font-semibold text-cream">Resolve</button>
                <button name="status" value="REJECTED" className="h-10 rounded-full border border-border px-5 text-sm font-semibold">Reject</button>
                {r.status === "OPEN" && <button name="status" value="REVIEWING" className="h-10 px-2 text-sm font-semibold text-forest underline underline-offset-4">Mark as reviewing</button>}
              </form>
            </li>
          ))}
        </ul>
      )}
      {recent.length > 0 && (
        <>
          <h2 className="mt-12 text-3xl">Recently closed</h2>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {recent.map((r) => (
              <li key={r.id} className="py-3 text-sm">
                <strong>{titleCase(r.status)}</strong> · {r.place.name} · {titleCase(r.kind)}
                {r.resolutionNote && <span className="block text-xs text-ink-soft">{r.resolutionNote}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
