import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50";

export const pillVariants = {
  primary: "bg-forest text-cream hover:bg-forest-soft",
  accent: "bg-terracotta text-ink hover:bg-[#e58a6c]",
  outline: "border border-forest/30 text-forest hover:bg-forest hover:text-cream",
  light: "border border-cream/50 text-cream hover:bg-cream hover:text-forest",
  quiet: "text-forest underline-offset-4 hover:underline",
} as const;

export const pillSizes = {
  sm: "h-9 px-4 text-xs",
  md: "h-11 px-6 text-sm",
  lg: "h-13 px-8 text-sm",
} as const;

export function pill(variant: keyof typeof pillVariants = "primary", size: keyof typeof pillSizes = "md", className?: string) {
  return cn(base, pillVariants[variant], pillSizes[size], className);
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof pillVariants; size?: keyof typeof pillSizes }) {
  return <Link className={pill(variant, size, className)} {...props} />;
}
