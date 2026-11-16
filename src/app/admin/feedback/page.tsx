import type { Metadata } from "next";
import Link from "next/link";
import { titleCase } from "@/lib/utils/format";
import { prisma } from "@/server/db/prisma";
import { setFeedbackStatus } from "../actions";

export const metadata: Metadata = { title: "Feedback" };

export default async function AdminFeedbackPage({ searchParams }: PageProps<"/admin/feedback">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && ["NEW", "REVIEWED", "CLOSED"].includes(sp.status) ? sp.status : "NEW";
  const [items, counts] = await Promise.all([
    prisma.feedback.findMany({ where: { status: status as never }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.feedback.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  return (
    <>
      <h1 className="text-5xl">Feedback</h1>
      <nav aria-label="Status" className="mt-6 flex gap-2">
        {["NEW", "REVIEWED", "CLOSED"].map((s) => (
          <Link key={s} href={`/admin/feedback?status=${s}`} aria-current={s === status ? "page" : undefined}
            className="inline-flex h-9 items-center rounded-full border border-border px-4 text-xs font-semibold aria-[current=page]:border-forest aria-[current=page]:bg-forest aria-[current=page]:text-cream">
            {titleCase(s)} · {count(s)}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">No {status.toLowerCase()} messages.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((f) => (
            <li key={f.id} className="border border-border bg-paper p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">{f.topic}</p>
                <p className="text-xs text-ink-soft">{f.email ? <a className="underline" href={`mailto:${f.email}`}>{f.email}</a> : "No reply address"} · {f.createdAt.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{f.message}</p>
              <form action={setFeedbackStatus} className="mt-4 flex gap-3">
                <input type="hidden" name="id" value={f.id} />
                {f.status !== "REVIEWED" && <button name="status" value="REVIEWED" className="h-9 rounded-full bg-forest px-4 text-xs font-semibold text-cream">Mark reviewed</button>}
                {f.status !== "CLOSED" && <button name="status" value="CLOSED" className="h-9 rounded-full border border-border px-4 text-xs font-semibold">Close</button>}
                {f.status !== "NEW" && <button name="status" value="NEW" className="h-9 px-2 text-xs font-semibold text-forest underline underline-offset-4">Move back to new</button>}
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
