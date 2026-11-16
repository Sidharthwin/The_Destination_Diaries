import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/layout/button-link";
import { TripCard, tripHref } from "@/components/trip/trip-card";
import { dateRangeLabel } from "@/lib/utils/format";
import { todayIso } from "@/lib/utils/time";
import { requireUserPage } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { listDestinations } from "@/server/services/places";
import { listTrips } from "@/server/services/trips";

export const metadata: Metadata = { title: "Dashboard" };

const NOTICES: Record<string, string> = {
  "admin-only": "That area is for administrators only.",
  "password-updated": "Your password has been updated.",
};

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUserPage("/dashboard");
  const sp = await searchParams;
  const [trips, savedCount, destinations] = await Promise.all([
    listTrips(user.id),
    prisma.savedPlace.count({ where: { profileId: user.id } }),
    listDestinations(),
  ]);
  const today = todayIso();
  const upcoming = trips.filter((t) => t.status === "PLANNED" && t.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const next = upcoming[0];
  const drafts = trips.filter((t) => t.status === "DRAFT");
  const notice = typeof sp.notice === "string" ? NOTICES[sp.notice] : undefined;
  const firstName = (user.displayName ?? "traveller").split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8">
      {notice && <p role="status" className="mb-8 border-l-2 border-terracotta bg-paper px-4 py-3 text-sm">{notice}</p>}
      <p className="eyebrow">Dashboard</p>
      <h1 className="mt-3 text-5xl sm:text-6xl">Hello, {firstName}.</h1>

      {trips.length === 0 ? (
        <section className="mt-12 grid gap-10 border border-border bg-paper p-8 sm:p-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="text-4xl">Your diary is empty — let&apos;s start the first entry.</h2>
            <p className="mt-4 max-w-md leading-relaxed text-ink-soft">Answer ten short questions and we will build a day-by-day plan you can edit, replan and share.</p>
            <ButtonLink href="/trips/new" size="lg" className="mt-8">Plan your first trip</ButtonLink>
          </div>
          <div>
            <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Or start from a destination</h3>
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {destinations.map((d) => (
                <li key={d.slug}>
                  <Link href={`/trips/new?destination=${d.slug}`} className="flex items-baseline justify-between py-3 hover:text-terracotta-deep">
                    <span className="font-serif text-2xl">{d.name}</span>
                    <span className="text-xs uppercase tracking-[0.16em] text-ink-soft">{d.state}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <>
          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-4">
            {[
              ["Trips", trips.length, "/my-trips"],
              ["Upcoming", upcoming.length, "/my-trips"],
              ["Drafts", drafts.length, "/my-trips"],
              ["Saved places", savedCount, "/saved"],
            ].map(([label, value, href]) => (
              <Link key={label as string} href={href as string} className="bg-paper p-5 transition-colors hover:bg-sand-soft">
                <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">{label}</dt>
                <dd className="mt-1 font-serif text-4xl tabular">{value}</dd>
              </Link>
            ))}
          </dl>

          {next && (
            <section className="mt-12">
              <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Next up</h2>
              <Link href={tripHref(next)} className="group mt-4 flex flex-col gap-2 border-y border-ink/15 py-7 sm:flex-row sm:items-baseline sm:justify-between">
                <span className="font-serif text-4xl transition-colors group-hover:text-terracotta-deep sm:text-5xl">{next.title}</span>
                <span className="text-sm text-ink-soft">{next.destination.name} · {dateRangeLabel(next.startDate, next.endDate)} · {next.stopCount} stops</span>
              </Link>
            </section>
          )}

          <section className="mt-12">
            <div className="flex items-baseline justify-between">
              <h2 className="text-3xl">Recent trips</h2>
              <Link href="/my-trips" className="text-sm font-semibold text-forest underline underline-offset-4">All trips</Link>
            </div>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {trips.slice(0, 3).map((t) => <TripCard key={t.id} trip={t} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
