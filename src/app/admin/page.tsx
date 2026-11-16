import Link from "next/link";
import { daysAgo } from "@/lib/utils/time";
import { prisma } from "@/server/db/prisma";

export default async function AdminOverviewPage() {
  const since = daysAgo(1);
  const [places, byStatus, noHours, noPrice, openReports, failedJobs, newFeedback, providerErrors, trips] = await Promise.all([
    prisma.place.count({ where: { isActive: true } }),
    prisma.place.groupBy({ by: ["verificationStatus"], _count: true, where: { isActive: true } }),
    prisma.place.count({ where: { isActive: true, openingHours: { none: {} } } }),
    prisma.place.count({ where: { isActive: true, prices: { none: {} } } }),
    prisma.placeReport.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
    prisma.ingestionJob.count({ where: { status: "FAILED" } }),
    prisma.feedback.count({ where: { status: "NEW" } }),
    prisma.providerUsageLog.count({ where: { status: { not: "ok" }, createdAt: { gte: since } } }),
    prisma.trip.count(),
  ]);
  const verified = byStatus.find((s) => s.verificationStatus === "VERIFIED")?._count ?? 0;

  const cards: [string, number | string, string, string][] = [
    ["Active places", places, "/admin/places", `${verified} verified`],
    ["Missing opening hours", noHours, "/admin/places?missing=hours", "Shown to users as “not on record”"],
    ["Missing prices", noPrice, "/admin/places?missing=price", "Excluded from budgets until known"],
    ["Open reports", openReports, "/admin/places/review", "From travellers"],
    ["Failed imports", failedJobs, "/admin/ingestion", "Can be retried"],
    ["New feedback", newFeedback, "/admin/feedback", "Unread messages"],
    ["Provider errors (24h)", providerErrors, "/admin/providers", "Maps, routing, AI, imports"],
    ["Trips planned", trips, "/admin/providers", "All users"],
  ];

  return (
    <>
      <h1 className="text-5xl">Data quality at a glance</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Nothing here is treated as authoritative until a person verifies it. AI-generated text is never used as a source for place facts.
      </p>
      <dl className="mt-8 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, href, hint]) => (
          <Link key={label} href={href} className="bg-paper p-5 transition-colors hover:bg-sand-soft">
            <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">{label}</dt>
            <dd className="mt-1 font-serif text-4xl tabular">{value}</dd>
            <dd className="mt-1 text-xs text-ink-soft">{hint}</dd>
          </Link>
        ))}
      </dl>
    </>
  );
}
