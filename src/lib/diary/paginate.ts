import type { Chapter, Diary, PhotoRef } from "./types";

export type DiaryPage =
  | { kind: "cover" }
  | { kind: "endpaper" }
  | { kind: "title" }
  | { kind: "contents" }
  | { kind: "chapter"; chapter: Chapter; number: number }
  | { kind: "text"; chapter: Chapter; number: number; text: string; note: string | null }
  | { kind: "photos"; chapter: Chapter; number: number; photos: PhotoRef[] }
  | { kind: "end" }
  | { kind: "blank" }
  | { kind: "back" };

const CHARS_PER_PAGE = 620;

/** Splits text into page-sized pieces at paragraph, then sentence, boundaries. */
export function splitText(body: string, limit = CHARS_PER_PAGE): string[] {
  const pages: string[] = [];
  let current = "";
  const push = () => {
    if (current.trim()) pages.push(current.trim());
    current = "";
  };
  for (const paragraph of body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)) {
    if ((current + "\n\n" + paragraph).length <= limit) {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
      continue;
    }
    push();
    if (paragraph.length <= limit) {
      current = paragraph;
      continue;
    }
    // A long paragraph: break at sentence ends.
    for (const sentence of paragraph.match(/[^.!?]+[.!?]*\s*/g) ?? [paragraph]) {
      if ((current + sentence).length > limit && current) push();
      current += sentence;
      while (current.length > limit) {
        // A single very long sentence: hard wrap at the last space.
        const cut = current.lastIndexOf(" ", limit);
        const at = cut > limit * 0.5 ? cut : limit;
        pages.push(current.slice(0, at).trim());
        current = current.slice(at);
      }
    }
  }
  push();
  return pages;
}

/**
 * Lays a diary out as book pages. Page 0 is the front cover and the last page
 * is the back cover; the total is always even so pages pair into leaves.
 */
export function paginate(diary: Diary): DiaryPage[] {
  const pages: DiaryPage[] = [{ kind: "cover" }, { kind: "endpaper" }, { kind: "title" }];
  pages.push(diary.chapters.length > 1 ? { kind: "contents" } : { kind: "blank" });

  diary.chapters.forEach((chapter, i) => {
    const number = i + 1;
    // Chapters open on a right-hand page (even index).
    if (pages.length % 2 === 1) pages.push({ kind: "blank" });
    pages.push({ kind: "chapter", chapter, number });
    const texts = splitText(chapter.body);
    const [lead, ...rest] = chapter.photos;
    void lead; // the first photo is shown on the chapter opener
    const groups: PhotoRef[][] = [];
    for (let k = 0; k < rest.length; k += 2) groups.push(rest.slice(k, k + 2));
    const count = Math.max(texts.length, groups.length);
    for (let k = 0; k < count; k++) {
      if (texts[k]) pages.push({ kind: "text", chapter, number, text: texts[k], note: k === 0 && chapter.note ? chapter.note : null });
      if (groups[k]) pages.push({ kind: "photos", chapter, number, photos: groups[k] });
    }
    if (texts.length === 0 && chapter.note) pages.push({ kind: "text", chapter, number, text: "", note: chapter.note });
  });

  pages.push({ kind: "end" });
  // The back cover must be the back of the last leaf (odd index).
  if (pages.length % 2 === 1) pages.push({ kind: "blank" });
  pages.push({ kind: "endpaper" }, { kind: "back" });
  if (pages.length % 2 === 1) pages.splice(pages.length - 2, 0, { kind: "blank" });
  return pages;
}

export function diaryStats(diary: Diary) {
  const photos = diary.chapters.reduce((n, c) => n + c.photos.length, 0);
  const words = diary.chapters.reduce((n, c) => n + c.body.split(/\s+/).filter(Boolean).length, 0);
  return { chapters: diary.chapters.length, photos, words, pages: paginate(diary).length };
}
