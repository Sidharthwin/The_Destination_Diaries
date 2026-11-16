import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookViewer } from "@/components/diary/book-viewer";
import { ButtonLink } from "@/components/layout/button-link";
import { dateSpan } from "@/lib/diary/dates";
import { diaryStats } from "@/lib/diary/paginate";
import { SAMPLE_DIARIES, getSampleBySlug } from "@/lib/diary/samples";
import { getTemplate } from "@/lib/diary/templates";

export async function generateMetadata({ params }: PageProps<"/diary/[slug]">): Promise<Metadata> {
  const diary = getSampleBySlug((await params).slug);
  return diary ? { title: diary.title, description: `${diary.subtitle} — a sample travel diary.` } : {};
}

export default async function PublicDiaryPage({ params }: PageProps<"/diary/[slug]">) {
  const diary = getSampleBySlug((await params).slug);
  if (!diary) notFound();
  const stats = diaryStats(diary);
  const template = getTemplate(diary.template);
  const others = SAMPLE_DIARIES.filter((d) => d.id !== diary.id);
  const credits = [...new Map(diary.chapters.flatMap((c) => c.photos).concat(diary.coverPhoto ?? []).map((p) => [p.id, p])).values()];

  return (
    <>
      <section className="bg-[#1a2420] pb-16 pt-10 text-cream">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker text-sand">Sample diary · {template.name}</p>
              <h1 className="mt-3 text-5xl sm:text-6xl">{diary.title}</h1>
              <p className="mt-2 text-cream/70">{diary.destination} · {dateSpan(diary.startDate, diary.endDate)} · {stats.chapters} chapters · {stats.photos} photographs</p>
            </div>
            <ButtonLink href="/diaries/new" variant="accent">Make your own</ButtonLink>
          </div>
          <BookViewer diary={diary} className="mt-10" />
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="kicker">About this diary</p>
            <p className="mt-4 max-w-xl font-serif text-2xl leading-snug">
              This is an example written by the Destination Diaries team to show what a finished diary looks like. It is an illustration, not an account by a real traveller.
            </p>
            <h2 className="mt-10 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Photographs</h2>
            <ul className="mt-3 space-y-1 text-sm text-ink-soft">
              {credits.map((p) => <li key={p.id}>{p.caption} — {p.credit}, via Wikimedia Commons</li>)}
            </ul>
          </div>
          <div>
            <p className="kicker">More from the shelf</p>
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {others.map((d) => (
                <li key={d.id}>
                  <Link href={`/diary/${d.slug}`} className="group flex items-baseline justify-between gap-4 py-4">
                    <span className="font-serif text-3xl transition-colors group-hover:text-terracotta-deep">{d.title}</span>
                    <span className="text-xs uppercase tracking-[0.16em] text-ink-soft">{d.destination}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
