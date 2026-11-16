"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { ACCEPTED_IMAGE_TYPES, addMedia, deleteMedia, saveDiary } from "@/lib/diary/store";
import type { PhotoRef } from "@/lib/diary/types";
import { cn } from "@/lib/utils";
import { DiaryPhoto } from "./diary-photo";
import { DiaryLoading, DiaryMissing } from "./diary-states";
import { useDiary } from "./use-diary";

export function MediaManager({ id }: { id: string }) {
  const { ready, diary, error } = useDiary(id);
  const file = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  if (!ready) return <DiaryLoading />;
  if (!diary) return <DiaryMissing error={error} />;

  async function upload(files: File[]) {
    if (!diary || files.length === 0) return;
    setProblems([]);
    setProgress({ done: 0, total: files.length });
    const added: PhotoRef[] = [];
    const failed: string[] = [];
    for (const [i, f] of files.entries()) {
      try {
        added.push({ ...(await addMedia(f)), caption: "" });
      } catch (err) {
        failed.push(err instanceof Error ? err.message : `${f.name} could not be added.`);
      }
      setProgress({ done: i + 1, total: files.length });
    }
    if (added.length) await saveDiary({ ...diary, library: [...diary.library, ...added] });
    setProblems(failed);
    setProgress(null);
  }

  const placed = diary.chapters.flatMap((c, i) => c.photos.map((p) => ({ photo: p, chapter: c, number: i + 1 })));
  const isCover = (p: PhotoRef) => Boolean(diary.coverPhoto && diary.coverPhoto.mediaId === p.mediaId && diary.coverPhoto.src === p.src);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <p className="kicker"><Link href={`/diaries/${id}`} className="hover:underline">{diary.title || "Untitled diary"}</Link></p>
      <h1 className="mt-3 text-5xl sm:text-6xl">Photographs</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">Add everything from the trip here, then place photos into chapters. Photos are resized and kept in this browser — they are not uploaded anywhere.</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); void upload([...e.dataTransfer.files]); }}
        className={cn("mt-8 flex flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-14 text-center transition-colors", over ? "border-forest bg-sand-soft" : "border-ink/25 bg-paper")}
      >
        <ImagePlus aria-hidden className="size-9 text-ink-soft" strokeWidth={1.25} />
        <p className="font-serif text-3xl">Drop photographs here</p>
        <p className="text-sm text-ink-soft">JPEG, PNG or WebP, up to 25 MB each</p>
        <button type="button" disabled={progress !== null} onClick={() => file.current?.click()} className="mt-2 inline-flex h-11 items-center rounded-full bg-forest px-6 text-sm font-semibold text-cream hover:bg-forest-soft disabled:opacity-50">
          {progress ? `Adding ${progress.done} of ${progress.total}…` : "Choose from your device"}
        </button>
        <input ref={file} type="file" multiple accept={ACCEPTED_IMAGE_TYPES.join(",")} className="sr-only" aria-label="Choose photographs to add"
          onChange={(e) => { const files = [...(e.target.files ?? [])]; e.target.value = ""; void upload(files); }} />
      </div>
      {progress && <div role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} className="mt-3 h-1 bg-sand-soft"><div className="h-full bg-terracotta transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>}
      {problems.length > 0 && <ul role="alert" className="mt-4 space-y-1 border-l-2 border-destructive bg-paper px-4 py-3 text-sm text-destructive">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}

      <section aria-labelledby="unplaced-heading" className="mt-12">
        <h2 id="unplaced-heading" className="text-3xl">Not yet in a chapter <span className="font-sans text-base font-normal text-ink-soft">({diary.library.length})</span></h2>
        {diary.library.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">Nothing waiting. New uploads appear here.</p>
        ) : (
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {diary.library.map((p) => (
              <li key={p.id} className="border border-border bg-paper p-2">
                <DiaryPhoto photo={p} alt={p.caption || "Uploaded photograph"} className="aspect-[4/3] w-full" />
                <Input aria-label="Caption" value={p.caption ?? ""} maxLength={90} placeholder="Add a caption" className="mt-2 h-9 bg-cream"
                  onChange={(e) => void saveDiary({ ...diary, library: diary.library.map((x) => (x.id === p.id ? { ...x, caption: e.target.value } : x)) })} />
                <div className="mt-2 flex items-center gap-2">
                  <select aria-label="Add to a chapter" value="" className="h-9 min-w-0 flex-1 rounded-md border border-input bg-cream px-2 text-xs"
                    onChange={(e) => {
                      const chapterId = e.target.value;
                      if (!chapterId) return;
                      void saveDiary({
                        ...diary,
                        library: diary.library.filter((x) => x.id !== p.id),
                        chapters: diary.chapters.map((c) => (c.id === chapterId ? { ...c, photos: [...c.photos, p] } : c)),
                      });
                    }}>
                    <option value="">Add to chapter…</option>
                    {diary.chapters.map((c, i) => <option key={c.id} value={c.id}>{i + 1}. {c.title || "Untitled chapter"}</option>)}
                  </select>
                  <button type="button" aria-pressed={isCover(p)} className="h-9 rounded-full border border-border px-3 text-xs font-semibold aria-pressed:border-forest aria-pressed:bg-forest aria-pressed:text-cream"
                    onClick={() => void saveDiary({ ...diary, coverPhoto: isCover(p) ? null : p })}>{isCover(p) ? "Cover ✓" : "Cover"}</button>
                  <button type="button" aria-label="Delete this photograph" className="inline-flex size-9 items-center justify-center rounded-full text-ink-soft hover:bg-sand-soft hover:text-destructive"
                    onClick={async () => {
                      await saveDiary({ ...diary, library: diary.library.filter((x) => x.id !== p.id), coverPhoto: isCover(p) ? null : diary.coverPhoto });
                      if (p.mediaId) await deleteMedia(p.mediaId);
                    }}><Trash2 className="size-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="placed-heading" className="mt-14">
        <h2 id="placed-heading" className="text-3xl">In the book <span className="font-sans text-base font-normal text-ink-soft">({placed.length})</span></h2>
        {placed.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">No photographs placed yet.</p>
        ) : (
          <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {placed.map(({ photo, chapter, number }) => (
              <li key={`${chapter.id}-${photo.id}`}>
                <Link href={`/diaries/${id}/chapters/${chapter.id}`} className="group block">
                  <DiaryPhoto photo={photo} alt={photo.caption || ""} className="aspect-square w-full transition-opacity group-hover:opacity-85" />
                  <span className="mt-1.5 block truncate text-xs text-ink-soft">Ch. {number} · {chapter.title || "Untitled"}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
