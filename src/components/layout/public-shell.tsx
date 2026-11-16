import type { ReactNode } from "react";
import { getCurrentUser } from "@/server/auth/session";
import { listDestinations } from "@/server/services/places";
import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav";

export async function PublicShell({ children, overHero = false }: { children: ReactNode; overHero?: boolean }) {
  const [user, destinations] = await Promise.all([
    getCurrentUser().catch(() => null),
    listDestinations().catch(() => []),
  ]);
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-forest focus:px-4 focus:py-2 focus:text-cream">
        Skip to content
      </a>
      <SiteNav overHero={overHero} signedIn={Boolean(user)} />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter destinations={destinations.map((d) => ({ slug: d.slug, name: d.name }))} />
    </>
  );
}
