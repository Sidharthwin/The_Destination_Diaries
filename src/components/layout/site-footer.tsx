import Link from "next/link";
import { SITE_TAGLINE } from "@/lib/constants/travel";
import { Logo } from "./logo";

const COLUMNS = [
  {
    title: "Plan",
    links: [
      { href: "/explore", label: "Explore destinations" },
      { href: "/trips/new", label: "Plan a trip" },
      { href: "/my-trips", label: "My trips" },
      { href: "/saved", label: "Saved places" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
];

export function SiteFooter({ destinations }: { destinations: { slug: string; name: string }[] }) {
  return (
    <footer className="mt-auto bg-forest text-cream">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-20 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo className="text-cream" />
            <p className="mt-5 max-w-sm font-serif text-2xl italic leading-snug text-sand">{SITE_TAGLINE}</p>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-cream/70">
              Itineraries are built by a deterministic planning engine. Travel times and costs are
              estimates unless marked verified — always confirm timings and prices locally.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-sand">{col.title}</h2>
                <ul className="mt-5 space-y-3 text-sm">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-cream/80 transition-colors hover:text-cream">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
            {destinations.length > 0 && (
              <nav aria-label="Destinations">
                <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-sand">Destinations</h2>
                <ul className="mt-5 space-y-3 text-sm">
                  {destinations.map((d) => (
                    <li key={d.slug}>
                      <Link href={`/destinations/${d.slug}`} className="text-cream/80 transition-colors hover:text-cream">{d.name}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>
        </div>
        <div className="mt-16 flex flex-col gap-3 border-t border-cream/15 pt-6 text-xs text-cream/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Destination Diaries. Made for travellers in India.</p>
          <p>
            Photography via Wikimedia Commons contributors (CC BY / CC BY-SA) ·{" "}
            <Link href="/about#data" className="underline underline-offset-2 hover:text-cream">Data sources &amp; credits</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
