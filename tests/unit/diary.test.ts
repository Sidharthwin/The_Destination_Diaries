import { describe, expect, it } from "vitest";
import { dateSpan, formatDiaryDate } from "@/lib/diary/dates";
import { diaryStats, paginate, splitText } from "@/lib/diary/paginate";
import { SAMPLE_DIARIES } from "@/lib/diary/samples";
import { TEMPLATES, getTemplate } from "@/lib/diary/templates";
import type { Diary } from "@/lib/diary/types";

const empty: Diary = {
  id: "x", title: "T", subtitle: "", author: "A", destination: "D", startDate: "", endDate: "",
  template: "journal", coverPhoto: null, chapters: [], library: [], createdAt: "", updatedAt: "",
};

describe("splitText", () => {
  it("keeps short text on one page and never loses words", () => {
    expect(splitText("One.\n\nTwo.")).toEqual(["One.\n\nTwo."]);
    const long = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} is here.`).join(" ");
    const pages = splitText(long, 200);
    expect(pages.length).toBeGreaterThan(3);
    for (const p of pages) expect(p.length).toBeLessThanOrEqual(200);
    expect(pages.join(" ").split(/\s+/)).toEqual(long.split(/\s+/));
  });

  it("breaks at paragraph boundaries first, and hard-wraps unbroken text", () => {
    const a = "a".repeat(150);
    const b = "b".repeat(150);
    expect(splitText(`${a}\n\n${b}`, 200)).toEqual([a, b]);
    const wall = "x".repeat(950);
    const pages = splitText(wall, 300);
    expect(pages.join("")).toBe(wall);
    expect(Math.max(...pages.map((p) => p.length))).toBeLessThanOrEqual(300);
  });

  it("returns nothing for blank text", () => {
    expect(splitText("  \n\n  ")).toEqual([]);
  });
});

describe("paginate", () => {
  it.each([empty, ...SAMPLE_DIARIES])("lays out a valid book for %#", (diary) => {
    const pages = paginate(diary);
    expect(pages.length % 2).toBe(0); // pages pair into leaves
    expect(pages[0].kind).toBe("cover");
    expect(pages.at(-1)!.kind).toBe("back");
    expect(pages.filter((p) => p.kind === "end")).toHaveLength(1);
    // Chapters open on a right-hand page, in order.
    const openers = pages.map((p, i) => ({ p, i })).filter(({ p }) => p.kind === "chapter");
    expect(openers).toHaveLength(diary.chapters.length);
    openers.forEach(({ p, i }, n) => {
      expect(i % 2).toBe(0);
      expect(p.kind === "chapter" && p.number).toBe(n + 1);
    });
  });

  it("puts every word and every photo of a chapter into the book", () => {
    for (const diary of SAMPLE_DIARIES) {
      const pages = paginate(diary);
      for (const chapter of diary.chapters) {
        const text = pages.flatMap((p) => (p.kind === "text" && p.chapter.id === chapter.id ? [p.text] : [])).join(" ");
        expect(text.split(/\s+/).filter(Boolean)).toEqual(chapter.body.split(/\s+/).filter(Boolean));
        const shown = pages.flatMap((p) => (p.kind === "photos" && p.chapter.id === chapter.id ? p.photos : []));
        expect(shown.map((x) => x.id)).toEqual(chapter.photos.slice(1).map((x) => x.id)); // first photo is the opener
        const notes = pages.filter((p) => p.kind === "text" && p.chapter.id === chapter.id && p.note);
        expect(notes).toHaveLength(chapter.note ? 1 : 0);
      }
    }
  });

  it("shows a margin note even when the chapter has no text yet", () => {
    const diary = { ...empty, chapters: [{ id: "c", title: "", place: "", date: "", body: "", note: "Remember this", photos: [] }] };
    expect(paginate(diary).some((p) => p.kind === "text" && p.note === "Remember this")).toBe(true);
  });

  it("counts chapters, photos and words", () => {
    const s = diaryStats(SAMPLE_DIARIES[0]);
    expect(s).toMatchObject({ chapters: 3, photos: 6 });
    expect(s.words).toBeGreaterThan(200);
  });
});

describe("templates and dates", () => {
  it("offers five distinct styles and falls back safely", () => {
    expect(TEMPLATES).toHaveLength(5);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(5);
    expect(getTemplate("nonsense").id).toBe("journal");
  });

  it("formats dates and spans without timezone drift", () => {
    expect(formatDiaryDate("2026-01-09")).toBe("9 January 2026");
    expect(formatDiaryDate("")).toBe("");
    expect(formatDiaryDate("garbage")).toBe("");
    expect(dateSpan("2026-01-09", "2026-01-11")).toBe("9 – 11 January 2026");
    expect(dateSpan("2026-01-30", "2026-02-02")).toBe("30 January – 2 February 2026");
    expect(dateSpan("2026-01-09", "")).toBe("9 January 2026");
  });
});
