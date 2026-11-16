"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/places", label: "Places" },
  { href: "/admin/places/review", label: "Review queue" },
  { href: "/admin/ingestion", label: "Ingestion" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/providers", label: "Providers" },
];

export function AdminNav() {
  const pathname = usePathname();
  const current = [...LINKS].sort((a, b) => b.href.length - a.href.length).find((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))?.href;
  return (
    <nav aria-label="Admin" className="lg:sticky lg:top-24 lg:self-start">
      <p className="eyebrow mb-3 hidden lg:block">Administration</p>
      <ul className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} aria-current={current === l.href ? "page" : undefined}
              className="block whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft hover:text-ink aria-[current=page]:bg-sand-soft aria-[current=page]:text-ink">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
