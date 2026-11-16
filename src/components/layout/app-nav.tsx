"use client";

import { LogOut, Menu, Plus, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ButtonLink } from "./button-link";
import { Logo } from "./logo";

export function AppNav({ name, isAdmin }: { name: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/my-trips", label: "My trips" },
    { href: "/saved", label: "Saved" },
    { href: "/explore", label: "Explore" },
    { href: "/profile", label: "Profile" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  const active = (href: string) => pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-6 px-4 sm:px-6">
        <Logo href="/dashboard" className="[&>span:first-child]:text-xl" />
        <nav aria-label="App" className="hidden flex-1 items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active(l.href) ? "page" : undefined}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink aria-[current=page]:bg-sand-soft aria-[current=page]:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ButtonLink href="/trips/new" size="sm"><Plus aria-hidden className="size-4" /> New trip</ButtonLink>
          <form action="/auth/signout" method="post" className="hidden lg:block">
            <button type="submit" title={`Sign out ${name}`} aria-label="Sign out" className="inline-flex size-9 items-center justify-center rounded-full text-ink-soft hover:bg-sand-soft hover:text-ink">
              <LogOut aria-hidden className="size-4" />
            </button>
          </form>
          <button type="button" className="inline-flex size-10 items-center justify-center lg:hidden" aria-expanded={open} aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="App (mobile)" className="border-t border-border bg-cream px-4 pb-4 lg:hidden">
          <ul>
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setOpen(false)} className={cn("block border-b border-border py-3.5 font-medium", active(l.href) && "text-terracotta-deep")}>{l.label}</Link>
              </li>
            ))}
          </ul>
          <form action="/auth/signout" method="post" className="pt-4">
            <button type="submit" className="text-sm font-semibold text-forest underline underline-offset-4">Sign out {name}</button>
          </form>
        </nav>
      )}
    </header>
  );
}
