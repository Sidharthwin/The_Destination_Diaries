import type { Metadata } from "next";
import Link from "next/link";
import { PlaceCard } from "@/components/places/place-card";
import { requireUserPage } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { searchPlaces } from "@/server/services/places";

export const metadata: Metadata = { title: "Saved places" };

export default async function SavedPage() {
  const user = await requireUserPage("/saved");
  const saved = await prisma.savedPlace.findMany({
    where: { profileId: user.id },
    orderBy: { createdAt: "desc" },
    include: { place: { select: { cityId: true, city: { select: { slug: true } } } } },
  });
  // Reuse the search projection so cards are identical everywhere.
  const slugs = [...new Set(saved.map((s) => s.place.city.slug))];
  const ids = new Set(saved.map((s) => s.placeId));
  const cards = (
    await Promise.all(slugs.map((city) => searchPlaces({ city, limit: 50, offset: 0 })))
  ).flatMap((r) => r.places).filter((p) => ids.has(p.id));
  const order = new Map(saved.map((s, i) => [s.placeId, i]));
  cards.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8">
      <p className="eyebrow">Saved</p>
      <h1 className="mt-3 text-5xl sm:text-6xl">Places you have an eye on</h1>
      {cards.length === 0 ? (
        <p className="mt-10 max-w-md text-ink-soft">
          Nothing saved yet. Tap the bookmark on any place in{" "}
          <Link href="/explore" className="font-semibold text-forest underline underline-offset-2">Explore</Link> to keep it here.
        </p>
      ) : (
        <div className="mt-8 grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((p) => <PlaceCard key={p.id} place={p} saved canSave showCity />)}
        </div>
      )}
    </div>
  );
}
