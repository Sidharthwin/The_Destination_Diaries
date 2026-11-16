import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, intro }: { eyebrow: string; title: ReactNode; intro?: ReactNode }) {
  return (
    <header className="border-b border-border">
      <div className="mx-auto max-w-7xl px-5 pb-14 pt-16 sm:px-8 sm:pt-24">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl text-5xl leading-[1.02] sm:text-7xl">{title}</h1>
        {intro && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">{intro}</p>}
      </div>
    </header>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 [&_a]:font-semibold [&_a]:text-forest [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-12 [&_h2]:text-3xl [&_li]:mt-2 [&_p]:mt-4 [&_p]:leading-relaxed [&_p]:text-ink-soft [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-ink-soft">
      {children}
    </div>
  );
}
