"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "./button-link";
import { Logo } from "./logo";

const LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteNav({ overHero = false, signedIn }: { overHero?: boolean; signedIn: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const transparent = overHero && !scrolled && !open;

  return (
    <header
      className={cn(
        "top-0 z-40 w-full transition-colors duration-300",
        overHero ? "fixed" : "sticky",
        transparent ? "text-cream" : "border-b border-border/70 bg-cream/95 text-ink backdrop-blur",
      )}
    >
      <nav aria-label="Main" className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <ul className="hidden items-center gap-9 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                className="relative text-sm font-medium tracking-wide after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-300 hover:after:scale-x-100 aria-[current=page]:after:scale-x-100"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-3 md:flex">
          {signedIn ? (
            <ButtonLink href="/dashboard" size="sm" variant={transparent ? "light" : "primary"}>
              My trips
            </ButtonLink>
          ) : (
            <>
              <Link href="/login" className="px-2 text-sm font-medium tracking-wide hover:underline hover:underline-offset-4">
                Sign in
              </Link>
              <ButtonLink href="/signup" size="sm" variant={transparent ? "light" : "primary"}>
                Start planning
              </ButtonLink>
            </>
          )}
        </div>
        <button
          type="button"
          className="-mr-2 inline-flex size-11 items-center justify-center md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>
      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 top-18 bottom-0 z-40 overflow-y-auto bg-cream px-5 pb-10 pt-6 md:hidden">
          <ul className="divide-y divide-border">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className="block py-5 font-serif text-3xl">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3">
            {signedIn ? (
              <ButtonLink href="/dashboard" onClick={() => setOpen(false)}>My trips</ButtonLink>
            ) : (
              <>
                <ButtonLink href="/signup" onClick={() => setOpen(false)}>Start planning</ButtonLink>
                <ButtonLink href="/login" variant="outline" onClick={() => setOpen(false)}>Sign in</ButtonLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
