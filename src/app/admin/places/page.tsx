import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { KIND_LABELS, titleCase } from "@/lib/utils/format";
import { prisma } from "@/server/db/prisma";
import { findPossibleDuplicates } from "@/server/services/ingestion";

export const metadata: Metadata = { title: "Places" };
const PAGE = 40;

export default async function AdminPlacesPage({ searchParams }: PageProps<"/admin/places">) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = one("q").trim();
  const city = one("city");
  const status = one("status");
  const missing = one("missing");
  const page = Math.max(0, Number(one("page")) || 0);

  const where: Prisma.PlaceWhereInput = {
    ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    ...(city ? { city: { slug: city } } : {}),
    ...(["UNVERIFIED", "COMMUNITY", "VERIFIED"].includes(status) ? { verificationStatus: status as never } : {}),
    ...(missing === "hours" ? { openingHours: { none: {} } } : {}),
    ...(missing === "price" ? { prices: { none: {} } } : {}),
    ...(missing === "description" ? { OR: [{ description: null }, { description: "" }] } : {}),
  };
  const [rows, total, cities, duplicates] = await Promise.all([
    prisma.place.findMany({
      where,
      include: { city: true, sources: { select: { provider: true } }, _count: { select: { openingHours: true, prices: true, reports: true } } },
      orderBy: [{ city: { name: "asc" } }, { name: "asc" }],
      take: PAGE,
      skip: page * PAGE,
    }),
    prisma.place.count({ where }),
    prisma.city.findMany({ where: { places: { some: {} } }, orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    findPossibleDuplicates(10),
  ]);
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q && { q }), ...(city && { city }), ...(status && { status }), ...(missing && { missing }), ...patch });
    return `/admin/places?${p}`;
  };
  const select = "h-10 rounded-md border border-input bg-paper px-2 text-sm";

  return (
    <>
      <h1 className="text-5xl">Places</h1>
      <form className="mt-6 flex flex-wrap items-end gap-3" action="/admin/places">
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Name
          <input name="q" defaultValue={q} className={`${select} ml-2 w-48 font-normal normal-case tracking-normal text-ink`} />
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">City
          <select name="city" defaultValue={city} className={`${select} ml-2 font-normal normal-case tracking-normal text-ink`}>
            <option value="">All</option>
            {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Status
          <select name="status" defaultValue={status} className={`${select} ml-2 font-normal normal-case tracking-normal text-ink`}>
            <option value="">Any</option><option value="UNVERIFIED">Unverified</option><option value="COMMUNITY">Community</option><option value="VERIFIED">Verified</option>
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">Missing
          <select name="missing" defaultValue={missing} className={`${select} ml-2 font-normal normal-case tracking-normal text-ink`}>
            <option value="">—</option><option value="hours">Opening hours</option><option value="price">Price</option><option value="description">Description</option>
          </select>
        </label>
        <button type="submit" className="h-10 rounded-full bg-forest px-5 text-sm font-semibold text-cream">Filter</button>
        <Link href="/admin/places" className="text-sm font-semibold text-forest underline underline-offset-4">Reset</Link>
      </form>

      <p className="mt-6 text-sm text-ink-soft">{total} {total === 1 ? "place" : "places"}</p>
      <div className="mt-2 overflow-x-auto border border-border bg-paper">
        <table className="w-full min-w-[46rem] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-ink-soft">
              {["Place", "City", "Type", "Status", "Hours", "Prices", "Source", ""].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-semibold">{h || <span className="sr-only">Actions</span>}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <th scope="row" className="px-3 py-2.5 font-medium">
                  {p.name}
                  {!p.isActive && <span className="ml-2 text-xs font-normal text-destructive">inactive</span>}
                  {p._count.reports > 0 && <span className="ml-2 text-xs font-normal text-terracotta-deep">{p._count.reports} report{p._count.reports > 1 ? "s" : ""}</span>}
                </th>
                <td className="px-3 py-2.5">{p.city.name}</td>
                <td className="px-3 py-2.5">{KIND_LABELS[p.kind]}</td>
                <td className="px-3 py-2.5">{titleCase(p.verificationStatus)}</td>
                <td className="px-3 py-2.5 tabular">{p._count.openingHours || <span className="text-ink-soft">none</span>}</td>
                <td className="px-3 py-2.5 tabular">{p._count.prices || <span className="text-ink-soft">none</span>}</td>
                <td className="px-3 py-2.5 text-xs">{[...new Set(p.sources.map((s) => s.provider))].join(", ") || "—"}</td>
                <td className="px-3 py-2.5 text-right"><Link href={`/admin/places/${p.id}`} className="font-semibold text-forest underline underline-offset-4">Edit</Link></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-ink-soft">No places match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      {total > PAGE && (
        <nav aria-label="Pagination" className="mt-4 flex items-center gap-4 text-sm font-semibold">
          {page > 0 && <Link href={qs({ page: String(page - 1) })} className="text-forest underline underline-offset-4">← Previous</Link>}
          <span className="font-normal text-ink-soft">Page {page + 1} of {Math.ceil(total / PAGE)}</span>
          {(page + 1) * PAGE < total && <Link href={qs({ page: String(page + 1) })} className="text-forest underline underline-offset-4">Next →</Link>}
        </nav>
      )}

      <section className="mt-12">
        <h2 className="text-3xl">Possible duplicates</h2>
        <p className="mt-2 text-sm text-ink-soft">Active places in the same city within 150 m of each other with similar names. Deactivate one if they are the same place.</p>
        {duplicates.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">None found.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {duplicates.map((d) => (
              <li key={d.aId + d.bId} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 text-sm">
                <Link href={`/admin/places/${d.aId}`} className="font-semibold text-forest underline underline-offset-4">{d.aName}</Link>
                <span className="text-ink-soft">and</span>
                <Link href={`/admin/places/${d.bId}`} className="font-semibold text-forest underline underline-offset-4">{d.bName}</Link>
                <span className="text-ink-soft">· {d.city} · {d.meters} m apart</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
