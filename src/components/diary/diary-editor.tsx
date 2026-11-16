"use client";

import { ArrowDown, ArrowUp, BookOpen, Images, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { pill } from "@/components/layout/button-link";
import { diaryStats } from "@/lib/diary/paginate";
import { deleteDiary, saveDiary } from "@/lib/diary/store";
import { newId, type Diary } from "@/lib/diary/types";
import { DiaryForm } from "./diary-form";
import { DiaryPhoto } from "./diary-photo";
import { DiaryLoading, DiaryMissing } from "./diary-states";
import { CoverFace } from "./page-view";
import { useDiary } from "./use-diary";

export function DiaryEditor({ id }: { id: string }) {
  const router = useRouter();
  const { ready, diary, error } = useDiary(id);
  const [status, setStatus] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!ready) return <DiaryLoading />;
  if (!diary) return <DiaryMissing error={error} />;

  const persist = async (next: Diary, done = "Saved") => {
    setFailed(null);
    try {
      await saveDiary(next);
      setStatus(done);
    } catch {
      setFailed("Your change could not be saved. Your browser may be out of storage space.");
    }
  };
  const stats = diaryStats(diary);
  const move = (index: number, delta: number) => {
    const chapters = [...diary.chapters];
    const [c] = chapters.splice(index, 1);
    chapters.splice(index + delta, 0, c);
    void persist({ ...diary, chapters }, "Chapter order saved");
  };
  const allPhotos = [...new Map([...diary.chapters.flatMap((c) => c.photos), ...diary.library].map((p) => [p.mediaId ?? p.src, p])).values()];

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div className="min-w-0">
          <p className="kicker"><Link href="/diaries" className="hover:underline">My diaries</Link></p>
          <h1 className="mt-3 truncate text-5xl sm:text-6xl">{diary.title || "Untitled diary"}</h1>
          <p className="mt-2 text-sm text-ink-soft">{stats.chapters} {stats.chapters === 1 ? "chapter" : "chapters"} · {stats.photos} photos · {stats.words} words · {stats.pages - 2} pages</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span role="status" aria-live="polite" className="mr-2 text-xs text-forest">{status}</span>
          <Link href={`/diaries/${id}/media`} className={pill("outline", "sm")}><Images aria-hidden className="size-3.5" /> Photos</Link>
          <Link href={`/diaries/${id}/read`} className={pill("primary", "sm")}><BookOpen aria-hidden className="size-3.5" /> Read as a book</Link>
        </div>
      </div>
      {failed && <p role="alert" className="mt-4 border-l-2 border-destructive bg-paper px-4 py-3 text-sm text-destructive">{failed}</p>}

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section aria-labelledby="chapters-heading">
          <div className="flex items-baseline justify-between">
            <h2 id="chapters-heading" className="text-4xl">Chapters</h2>
            <button type="button" className={pill("outline", "sm")} onClick={async () => {
              const chapter = { id: newId(), title: "", place: diary.destination, date: "", body: "", note: "", photos: [] };
              await persist({ ...diary, chapters: [...diary.chapters, chapter] }, "Chapter added");
              router.push(`/diaries/${id}/chapters/${chapter.id}`);
            }}>
              <Plus aria-hidden className="size-3.5" /> Add a chapter
            </button>
          </div>
          {diary.chapters.length === 0 ? (
            <p className="mt-6 border border-dashed border-border p-6 text-sm text-ink-soft">No chapters yet. A chapter is usually a day, a place, or a single memory worth a page.</p>
          ) : (
            <ol className="mt-6 space-y-3">
              {diary.chapters.map((c, i) => (
                <li key={c.id} className="flex items-stretch gap-4 border border-border bg-paper p-3">
                  <Link href={`/diaries/${id}/chapters/${c.id}`} className="block h-24 w-32 shrink-0 overflow-hidden bg-sand-soft" aria-hidden tabIndex={-1}>
                    {c.photos[0] ? <DiaryPhoto photo={c.photos[0]} alt="" className="h-full w-full" /> : <span className="flex h-full items-center justify-center font-serif text-4xl text-ink/25">{String(i + 1).padStart(2, "0")}</span>}
                  </Link>
                  <div className="min-w-0 flex-1 py-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-terracotta-deep">Chapter {String(i + 1).padStart(2, "0")}</p>
                    <Link href={`/diaries/${id}/chapters/${c.id}`} className="block truncate font-serif text-2xl hover:underline hover:underline-offset-4">{c.title || "Untitled chapter"}</Link>
                    <p className="mt-0.5 truncate text-xs text-ink-soft">
                      {[c.place, `${c.photos.length} ${c.photos.length === 1 ? "photo" : "photos"}`, c.body.trim() ? `${c.body.split(/\s+/).filter(Boolean).length} words` : "not written yet"].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col justify-center">
                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${c.title || "chapter"} up`} className="inline-flex size-8 items-center justify-center rounded text-ink-soft hover:bg-sand-soft disabled:opacity-25"><ArrowUp className="size-4" /></button>
                    <button type="button" disabled={i === diary.chapters.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${c.title || "chapter"} down`} className="inline-flex size-8 items-center justify-center rounded text-ink-soft hover:bg-sand-soft disabled:opacity-25"><ArrowDown className="size-4" /></button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <h2 className="mt-14 text-4xl">Cover &amp; details</h2>
          <div className="mt-6">
            <DiaryForm value={diary} coverChoices={allPhotos} onChange={(patch) => void persist({ ...diary, ...patch })} />
          </div>

          <div className="mt-14 border-t border-border pt-6">
            {confirmDelete ? (
              <p className="flex flex-wrap items-center gap-4 text-sm">
                <span>Delete this diary and its photos from this browser? This cannot be undone.</span>
                <button type="button" className="font-semibold text-destructive underline underline-offset-4" onClick={async () => { await deleteDiary(id); router.push("/diaries"); }}>Yes, delete it</button>
                <button type="button" className="font-semibold underline underline-offset-4" onClick={() => setConfirmDelete(false)}>Keep it</button>
              </p>
            ) : (
              <button type="button" className="inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 aria-hidden className="size-4" /> Delete this diary
              </button>
            )}
          </div>
        </section>

        <aside aria-label="Cover preview" className="lg:sticky lg:top-24 lg:self-start">
          <div className="mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-r-md rounded-l-sm shadow-[0_30px_60px_-25px_rgba(0,0,0,0.6)]">
            <CoverFace diary={diary} />
          </div>
          <p className="mt-6 text-center text-xs leading-relaxed text-ink-soft">Saved automatically in this browser, on this device.<br />Nothing is uploaded to a server.</p>
        </aside>
      </div>
    </div>
  );
}
