"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { pill } from "@/components/layout/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { paginate } from "@/lib/diary/paginate";
import { ACCEPTED_IMAGE_TYPES, addMedia, saveDiary } from "@/lib/diary/store";
import type { Chapter, Diary, PhotoRef } from "@/lib/diary/types";
import { DiaryPhoto } from "./diary-photo";
import { DiaryLoading, DiaryMissing } from "./diary-states";
import { PageView } from "./page-view";
import { useDiary } from "./use-diary";

export function ChapterEditor({ id, chapterId }: { id: string; chapterId: string }) {
  const { ready, diary, error } = useDiary(id);
  if (!ready) return <DiaryLoading />;
  const chapter = diary?.chapters.find((c) => c.id === chapterId);
  if (!diary || !chapter) return <DiaryMissing error={error} />;
  // Keyed so the working copy resets when you move to another chapter.
  return <Editor key={chapterId} diary={diary} initial={chapter} />;
}

function Editor({ diary, initial }: { diary: Diary; initial: Chapter }) {
  const [chapter, setChapter] = useState(initial);
  const [state, setState] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const latest = useRef({ diary, chapter });
  useEffect(() => {
    latest.current = { diary, chapter };
  }, [diary, chapter]);

  // Autosave shortly after the last change.
  useEffect(() => {
    if (state !== "dirty") return;
    const t = setTimeout(async () => {
      setState("saving");
      const { diary: d, chapter: c } = latest.current;
      try {
        await saveDiary({ ...d, chapters: d.chapters.map((x) => (x.id === c.id ? c : x)) });
        setState((s) => (s === "saving" ? "saved" : s));
      } catch {
        setState("error");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [state, chapter]);

  const set = (patch: Partial<Chapter>) => {
    setChapter((c) => ({ ...c, ...patch }));
    setState("dirty");
  };
  const setPhotos = (photos: PhotoRef[]) => set({ photos });

  const index = diary.chapters.findIndex((c) => c.id === chapter.id);
  const prev = diary.chapters[index - 1];
  const next = diary.chapters[index + 1];
  const unplaced = diary.library.filter((p) => !chapter.photos.some((x) => x.mediaId === p.mediaId));

  // Live preview: this chapter's pages as they will appear in the book.
  const preview = useMemo(() => {
    const draft = { ...diary, chapters: diary.chapters.map((c) => (c.id === chapter.id ? chapter : c)) };
    return { draft, pages: paginate(draft).map((page, i) => ({ page, i })).filter(({ page }) => "chapter" in page && page.chapter.id === chapter.id) };
  }, [diary, chapter]);

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
        <p className="kicker"><Link href={`/diaries/${diary.id}`} className="hover:underline">{diary.title || "Untitled diary"}</Link></p>
        <div className="flex items-center gap-4 text-sm">
          <span role="status" aria-live="polite" className={state === "error" ? "font-semibold text-destructive" : "text-ink-soft"}>
            {state === "saved" ? "All changes saved" : state === "error" ? "Could not save — storage may be full" : "Saving…"}
          </span>
          {prev && <Link href={`/diaries/${diary.id}/chapters/${prev.id}`} className="inline-flex items-center gap-1 font-semibold text-forest"><ArrowLeft aria-hidden className="size-4" /> Previous</Link>}
          {next && <Link href={`/diaries/${diary.id}/chapters/${next.id}`} className="inline-flex items-center gap-1 font-semibold text-forest">Next <ArrowRight aria-hidden className="size-4" /></Link>}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-terracotta-deep">Chapter {String(index + 1).padStart(2, "0")}</p>
          <div className="space-y-2">
            <Label htmlFor="c-title" className="sr-only">Chapter title</Label>
            <input id="c-title" value={chapter.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} placeholder="Give this chapter a name"
              className="w-full border-b border-ink/20 bg-transparent pb-2 font-serif text-5xl font-semibold outline-none placeholder:text-ink/25 focus:border-forest" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-place">Place</Label>
              <Input id="c-place" value={chapter.place} maxLength={80} onChange={(e) => set({ place: e.target.value })} className="h-11 bg-paper" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-date">Date</Label>
              <Input id="c-date" type="date" value={chapter.date} onChange={(e) => set({ date: e.target.value })} className="h-11 bg-paper" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-body">What happened</Label>
            <textarea id="c-body" value={chapter.body} onChange={(e) => set({ body: e.target.value })} rows={12} maxLength={20000}
              placeholder="Write it the way you would tell it. Leave a blank line between paragraphs."
              className="block w-full resize-y border border-input bg-paper p-5 font-serif text-xl font-medium leading-relaxed outline-none focus:border-forest" />
            <p className="text-xs text-ink-soft">{chapter.body.split(/\s+/).filter(Boolean).length} words</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-note">A note in the margin <span className="font-normal text-ink-soft">(optional, shown in handwriting)</span></Label>
            <input id="c-note" value={chapter.note} maxLength={90} onChange={(e) => set({ note: e.target.value })} placeholder="e.g. Go early."
              className="hand h-12 w-full border border-input bg-paper px-4 text-2xl text-terracotta-deep outline-none focus:border-forest" />
          </div>

          <fieldset>
            <legend className="text-sm font-medium">Photographs <span className="font-normal text-ink-soft">— the first one opens the chapter</span></legend>
            <ul className="mt-3 space-y-3">
              {chapter.photos.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 border border-border bg-paper p-2">
                  <DiaryPhoto photo={p} alt="" className="h-16 w-24 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`cap-${p.id}`} className="sr-only">Caption for photo {i + 1}</Label>
                    <Input id={`cap-${p.id}`} value={p.caption ?? ""} maxLength={90} placeholder="Add a caption"
                      onChange={(e) => setPhotos(chapter.photos.map((x) => (x.id === p.id ? { ...x, caption: e.target.value } : x)))} className="h-10 bg-cream" />
                  </div>
                  <button type="button" disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`} className="inline-flex size-8 items-center justify-center rounded text-ink-soft hover:bg-sand-soft disabled:opacity-25"
                    onClick={() => { const a = [...chapter.photos]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; setPhotos(a); }}><ArrowLeft className="size-4 rotate-90" /></button>
                  <button type="button" aria-label={`Remove photo ${i + 1} from this chapter`} className="inline-flex size-8 items-center justify-center rounded text-ink-soft hover:bg-sand-soft hover:text-destructive"
                    onClick={async () => {
                      // Uploaded photos go back to the diary's library rather than being lost.
                      const d = latest.current.diary;
                      const photos = chapter.photos.filter((x) => x.id !== p.id);
                      const library = p.mediaId && !d.library.some((x) => x.mediaId === p.mediaId) ? [...d.library, p] : d.library;
                      setChapter((c) => ({ ...c, photos }));
                      await saveDiary({ ...d, library, chapters: d.chapters.map((x) => (x.id === chapter.id ? { ...chapter, photos } : x)) });
                    }}><Trash2 className="size-4" /></button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="button" disabled={uploading} onClick={() => file.current?.click()} className={pill("outline", "sm")}>
                <ImagePlus aria-hidden className="size-3.5" /> {uploading ? "Adding…" : "Upload photos"}
              </button>
              <input ref={file} type="file" multiple accept={ACCEPTED_IMAGE_TYPES.join(",")} className="sr-only" aria-label="Upload photographs to this chapter"
                onChange={async (e) => {
                  const files = [...(e.target.files ?? [])];
                  e.target.value = "";
                  if (files.length === 0) return;
                  setUploading(true);
                  setUploadError(null);
                  const added: PhotoRef[] = [];
                  const problems: string[] = [];
                  for (const f of files) {
                    try {
                      added.push(await addMedia(f));
                    } catch (err) {
                      problems.push(err instanceof Error ? err.message : `${f.name} could not be added.`);
                    }
                  }
                  if (added.length) setPhotos([...latest.current.chapter.photos, ...added]);
                  if (problems.length) setUploadError(problems.join(" "));
                  setUploading(false);
                }} />
              <Link href={`/diaries/${diary.id}/media`} className="text-sm font-semibold text-forest underline underline-offset-4">Manage all photos</Link>
            </div>
            {uploadError && <p role="alert" className="mt-2 text-sm text-destructive">{uploadError}</p>}
            {unplaced.length > 0 && (
              <div className="mt-5">
                <p className="text-xs text-ink-soft">From this diary&apos;s photos — click to add here:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {unplaced.map((p) => (
                    <button key={p.id} type="button" aria-label={`Add ${p.caption || "photo"} to this chapter`} className="h-16 w-24 overflow-hidden border border-border hover:border-forest"
                      onClick={async () => {
                        const d = latest.current.diary;
                        const photos = [...chapter.photos, p];
                        setChapter((c) => ({ ...c, photos }));
                        await saveDiary({ ...d, library: d.library.filter((x) => x.id !== p.id), chapters: d.chapters.map((x) => (x.id === chapter.id ? { ...chapter, photos } : x)) });
                      }}>
                      <DiaryPhoto photo={p} alt="" className="h-full w-full" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </fieldset>
        </form>

        <aside aria-label="Page preview" className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">How it will look · {preview.pages.length} {preview.pages.length === 1 ? "page" : "pages"}</p>
          <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-4">
            {preview.pages.map(({ page, i }) => (
              <div key={i} className="aspect-[3/4] w-[min(22rem,78vw)] shrink-0 snap-start overflow-hidden paper-shadow">
                <PageView page={page} diary={preview.draft} index={i} />
              </div>
            ))}
          </div>
          <Link href={`/diaries/${diary.id}/read`} className="mt-2 inline-block text-sm font-semibold text-forest underline underline-offset-4">Read the whole book</Link>
        </aside>
      </div>
    </div>
  );
}
