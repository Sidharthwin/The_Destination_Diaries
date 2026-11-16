import type { Metadata } from "next";
import Link from "next/link";
import { BookThumb } from "@/components/diary/book-thumb";
import { ButtonLink } from "@/components/layout/button-link";
import { PageHeader } from "@/components/layout/page-header";
import { dateSpan } from "@/lib/diary/dates";
import { diaryStats } from "@/lib/diary/paginate";
import { SAMPLE_DIARIES } from "@/lib/diary/samples";
import { getTemplate } from "@/lib/diary/templates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Diaries", description: "Read example travel diaries from across India, then make your own." };

export default function DiscoverPage() {
  return (
    <>
      <PageHeader
        eyebrow="Diaries"
        title={<>Journeys, <span className="italic">bound</span></>}
        intro="Three example diaries from our own shelf, each in a different style. Open one and turn the pages."
      />
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <ul className="space-y-24">
          {SAMPLE_DIARIES.map((d, i) => {
            const s = diaryStats(d);
            return (
              <li key={d.id} className={cn("grid items-center gap-10 md:grid-cols-2 md:gap-20", i % 2 === 1 && "md:[&>*:first-child]:order-2")}>
                <Link href={`/diary/${d.slug}`} aria-label={`Read ${d.title}`} className={cn("mx-auto block w-[min(20rem,70vw)]", i % 2 ? "md:rotate-2" : "md:-rotate-2")}>
                  <BookThumb diary={d} />
                </Link>
                <div>
                  <p className="kicker">{d.destination}</p>
                  <h2 className="mt-4 text-5xl sm:text-6xl"><Link href={`/diary/${d.slug}`} className="hover:text-terracotta-deep">{d.title}</Link></h2>
                  <p className="mt-3 font-serif text-2xl italic text-ink-soft">{d.subtitle}</p>
                  <p className="mt-5 max-w-md leading-relaxed text-ink-soft">{d.chapters[0].body.split("\n\n")[0]}</p>
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
                    {dateSpan(d.startDate, d.endDate)} · {s.chapters} chapters · {s.photos} photographs · {getTemplate(d.template).name}
                  </p>
                  <ButtonLink href={`/diary/${d.slug}`} className="mt-7">Open the book</ButtonLink>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-24 border-t border-border pt-12 text-center">
          <p className="hand text-4xl text-terracotta-deep">your turn</p>
          <h2 className="mt-2 text-5xl">Every trip deserves its own book</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">These are examples written by our team. Reader-made diaries cannot be published here yet — yours stay private, in your browser.</p>
          <ButtonLink href="/diaries/new" variant="accent" size="lg" className="mt-7">Start a diary</ButtonLink>
        </div>
      </div>
    </>
  );
}
