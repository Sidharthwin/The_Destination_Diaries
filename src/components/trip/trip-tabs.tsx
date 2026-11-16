"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TripTabs({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/trips/${tripId}`, label: "Itinerary" },
    { href: `/trips/${tripId}/budget`, label: "Budget" },
    { href: `/trips/${tripId}/nearby`, label: "Nearby" },
    { href: `/trips/${tripId}/share`, label: "Share" },
  ];
  return (
    <nav aria-label="Trip sections" className="no-scrollbar -mb-px flex gap-6 overflow-x-auto">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={pathname === t.href ? "page" : undefined}
          className="whitespace-nowrap border-b-2 border-transparent pb-3 text-sm font-semibold text-ink-soft transition-colors hover:text-ink aria-[current=page]:border-terracotta aria-[current=page]:text-ink"
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
