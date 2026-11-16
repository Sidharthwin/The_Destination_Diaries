import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-baseline gap-2", className)} aria-label="Destination Diaries home">
      <span className="font-serif text-2xl leading-none tracking-tight">
        Destination <span className="italic">Diaries</span>
      </span>
      <span aria-hidden className="size-1.5 rounded-full bg-terracotta transition-transform duration-300 group-hover:scale-150" />
    </Link>
  );
}
