import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { KIND_LABELS, clock, inr, titleCase } from "@/lib/utils/format";
import { prisma } from "@/server/db/prisma";
import { addOpeningHours, addPrice, deleteOpeningHours, deletePrice, updatePlace } from "../../actions";

export const metadata: Metadata = { title: "Edit place" };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function AdminPlaceEditPage({ params, searchParams }: PageProps<"/admin/places/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const place = /^[0-9a-f-]{36}$/i.test(id)
    ? await prisma.place.findUnique({
        where: { id },
        include: {
          city: { include: { district: { include: { state: true } } } },
          sources: true,
          openingHours: { orderBy: [{ dayOfWeek: "asc" }, { opensMin: "asc" }] },
          prices: true,
          reports: { where: { status: { in: ["OPEN", "REVIEWING"] } } },
        },
      })
    : null;
  if (!place) notFound();
  const field = "mt-1.5 block h-10 w-full rounded-md border border-input bg-cream px-3 text-sm";
  const lab = "block text-sm font-medium";

  return (
    <>
      <p className="text-sm"><Link href="/admin/places" className="font-semibold text-forest underline underline-offset-4">← All places</Link></p>
      <h1 className="mt-3 text-5xl">{place.name}</h1>
      <p className="mt-2 text-sm text-ink-soft">{place.city.name}, {place.city.district.state.name}</p>
      {typeof sp.saved === "string" && <p role="status" className="mt-4 border-l-2 border-forest bg-paper px-4 py-3 text-sm">Saved.</p>}
      {typeof sp.error === "string" && <p role="alert" className="mt-4 border-l-2 border-destructive bg-paper px-4 py-3 text-sm text-destructive">{sp.error}</p>}
      {place.reports.length > 0 && (
        <p className="mt-4 border-l-2 border-terracotta bg-paper px-4 py-3 text-sm">
          {place.reports.length} open report{place.reports.length > 1 ? "s" : ""} on this place. <Link href="/admin/places/review" className="font-semibold text-forest underline underline-offset-2">Review</Link>
        </p>
      )}

      <form action={updatePlace} className="mt-8 grid gap-5 border border-border bg-paper p-6 sm:grid-cols-2">
        <input type="hidden" name="id" value={place.id} />
        <label className={`${lab} sm:col-span-2`}>Name<input name="name" defaultValue={place.name} required maxLength={160} className={field} /></label>
        <label className={`${lab} sm:col-span-2`}>Description
          <textarea name="description" defaultValue={place.description ?? ""} rows={3} maxLength={2000} className="mt-1.5 block w-full rounded-md border border-input bg-cream p-3 text-sm" />
        </label>
        <label className={lab}>Type
          <select name="kind" defaultValue={place.kind} className={field}>{Object.entries(KIND_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </label>
        <label className={lab}>Typical visit (minutes)<input name="typicalVisitMins" type="number" min={5} max={720} defaultValue={place.typicalVisitMins ?? ""} className={field} /></label>
        <label className={lab}>Latitude<input name="lat" type="number" step="any" defaultValue={place.lat} required className={field} /></label>
        <label className={lab}>Longitude<input name="lng" type="number" step="any" defaultValue={place.lng} required className={field} /></label>
        <label className={lab}>Verification
          <select name="verificationStatus" defaultValue={place.verificationStatus} className={field}>
            <option value="UNVERIFIED">Unverified</option><option value="COMMUNITY">Community-checked</option><option value="VERIFIED">Verified by us</option>
          </select>
          <span className="mt-1 block text-xs font-normal text-ink-soft">
            Mark verified only after checking against a reliable source.
            {place.lastVerifiedAt && ` Last verified ${place.lastVerifiedAt.toLocaleDateString("en-IN")}.`}
          </span>
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
          <input type="checkbox" name="isActive" defaultChecked={place.isActive} className="size-4 accent-forest" /> Active (shown to travellers and used in plans)
        </label>
        <button type="submit" className="h-11 justify-self-start rounded-full bg-forest px-6 text-sm font-semibold text-cream sm:col-span-2">Save place</button>
      </form>

      <div className="mt-10 grid gap-10 xl:grid-cols-2">
        <section>
          <h2 className="text-3xl">Opening hours</h2>
          <p className="mt-2 text-sm text-ink-soft">Leave empty if unknown — the planner then treats hours as unknown rather than guessing.</p>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {place.openingHours.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span><strong>{DAYS[h.dayOfWeek]}</strong> {clock(h.opensMin)} – {clock(h.closesMin)} <span className="text-xs text-ink-soft">· {titleCase(h.source)}</span></span>
                <form action={deleteOpeningHours}><input type="hidden" name="id" value={h.id} /><input type="hidden" name="placeId" value={place.id} />
                  <button type="submit" className="text-xs font-semibold text-destructive underline underline-offset-4">Remove</button></form>
              </li>
            ))}
            {place.openingHours.length === 0 && <li className="py-2.5 text-sm text-ink-soft">No hours on record.</li>}
          </ul>
          <form action={addOpeningHours} className="mt-4 space-y-3 border border-border bg-paper p-4">
            <input type="hidden" name="placeId" value={place.id} />
            <fieldset><legend className="text-sm font-medium">Days</legend>
              <div className="mt-2 flex flex-wrap gap-3">{DAYS.map((d, i) => <label key={d} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="days" value={i} className="accent-forest" />{d}</label>)}</div>
            </fieldset>
            <div className="flex flex-wrap items-end gap-3">
              <label className={lab}>Opens<input name="opens" type="time" required className={field} /></label>
              <label className={lab}>Closes<input name="closes" type="time" required className={field} /></label>
              <label className={lab}>Source<select name="source" className={field}><option value="VERIFIED">Verified</option><option value="PROVIDER_ESTIMATE">Provider</option><option value="USER_REPORTED">Traveller-reported</option></select></label>
              <button type="submit" className="h-10 rounded-full border border-forest/40 px-5 text-sm font-semibold text-forest">Add hours</button>
            </div>
          </form>
        </section>

        <section>
          <h2 className="text-3xl">Prices</h2>
          <p className="mt-2 text-sm text-ink-soft">Entry prices are counted per person in trip budgets, labelled with the source you choose.</p>
          <ul className="mt-4 divide-y divide-border border-y border-border">
            {place.prices.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span><strong>{titleCase(p.kind)}</strong> {inr(p.amountPaise)} <span className="text-xs text-ink-soft">· {titleCase(p.source)}{p.notes ? ` · ${p.notes}` : ""}</span></span>
                <form action={deletePrice}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="placeId" value={place.id} />
                  <button type="submit" className="text-xs font-semibold text-destructive underline underline-offset-4">Remove</button></form>
              </li>
            ))}
            {place.prices.length === 0 && <li className="py-2.5 text-sm text-ink-soft">No prices on record.</li>}
          </ul>
          <form action={addPrice} className="mt-4 flex flex-wrap items-end gap-3 border border-border bg-paper p-4">
            <input type="hidden" name="placeId" value={place.id} />
            <label className={lab}>Kind<select name="kind" className={field}><option value="ENTRY_INDIAN">Entry (Indian)</option><option value="ENTRY_FOREIGNER">Entry (foreigner)</option><option value="ACTIVITY">Activity</option><option value="MEAL_AVG">Average meal</option></select></label>
            <label className={lab}>Amount (₹)<input name="amountRupees" type="number" min={0} step="0.01" required className={`${field} w-28`} /></label>
            <label className={lab}>Source<select name="source" className={field}><option value="VERIFIED">Verified</option><option value="PROVIDER_ESTIMATE">Provider</option><option value="USER_REPORTED">Traveller-reported</option></select></label>
            <label className={lab}>Note<input name="notes" maxLength={300} className={field} /></label>
            <button type="submit" className="h-10 rounded-full border border-forest/40 px-5 text-sm font-semibold text-forest">Add price</button>
          </form>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-3xl">Provenance</h2>
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {place.sources.map((s) => (
            <li key={s.id} className="py-3 text-sm">
              <strong>{s.provider}</strong> · {s.attribution} · <span className="text-ink-soft">{s.licence}</span>
              <span className="block text-xs text-ink-soft">Record {s.externalId} · fetched {s.fetchedAt.toLocaleDateString("en-IN")}{s.rawRef?.startsWith("http") && <> · <a className="underline" href={s.rawRef} target="_blank" rel="noreferrer">source record</a></>}</span>
            </li>
          ))}
          {place.sources.length === 0 && <li className="py-3 text-sm text-ink-soft">No source recorded.</li>}
        </ul>
      </section>
    </>
  );
}
