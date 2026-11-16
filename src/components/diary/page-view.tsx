"use client";

import type { CSSProperties, ReactNode } from "react";
import { dateSpan, formatDiaryDate } from "@/lib/diary/dates";
import type { DiaryPage } from "@/lib/diary/paginate";
import { getTemplate, type DiaryTemplate } from "@/lib/diary/templates";
import type { Diary, PhotoRef } from "@/lib/diary/types";
import { cn } from "@/lib/utils";
import { DiaryPhoto } from "./diary-photo";

/**
 * Renders one book page. Everything is sized in container-query units (cqw),
 * so the same page is crisp as a shelf thumbnail and as a full-screen spread.
 */

function headingClass(t: DiaryTemplate) {
  return t.heading === "hand" ? "hand" : t.heading === "sans" ? "font-sans font-semibold tracking-tight" : "font-serif";
}

function Framed({ photo, t, tilt = 0, className }: { photo: PhotoRef; t: DiaryTemplate; tilt?: number; className?: string }) {
  const caption = photo.caption?.trim();
  const img = <DiaryPhoto photo={photo} className="h-full w-full" />;
  if (t.photo === "bleed") {
    return (
      <figure className={cn("relative", className)}>
        <div className="h-full w-full overflow-hidden">{img}</div>
        {caption && <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-[4cqw] pb-[2.5cqw] pt-[8cqw] text-[2.6cqw] italic text-white/90">{caption}</figcaption>}
      </figure>
    );
  }
  if (t.photo === "plain") {
    return (
      <figure className={cn("flex flex-col", className)}>
        <div className="min-h-0 flex-1 overflow-hidden">{img}</div>
        {caption && <figcaption className="mt-[1.6cqw] text-[2.3cqw] uppercase tracking-[0.18em]" style={{ color: t.muted }}>{caption}</figcaption>}
      </figure>
    );
  }
  if (t.photo === "polaroid") {
    return (
      <figure className={cn("flex flex-col bg-[#fdfbf5] p-[2.2cqw] pb-[1.5cqw] shadow-[0_0.6cqw_2.4cqw_rgba(0,0,0,0.28)]", className)} style={{ transform: `rotate(${tilt}deg)` }}>
        <div className="min-h-0 flex-1 overflow-hidden">{img}</div>
        <figcaption className="hand flex min-h-[6.5cqw] items-center justify-center px-[1cqw] pt-[1cqw] text-center text-[3.5cqw] leading-[1.05] text-[#2c2a22]">{caption}</figcaption>
      </figure>
    );
  }
  if (t.photo === "stamp") {
    return (
      <figure className={cn("relative flex flex-col", className)} style={{ transform: `rotate(${tilt / 2}deg)` }}>
        <div className="min-h-0 flex-1 bg-white p-[1.6cqw] shadow-[0_0.4cqw_1.8cqw_rgba(0,0,0,0.18)]" style={{ outline: `0.5cqw dashed ${t.accent}`, outlineOffset: "-0.9cqw" }}>
          <div className="h-full w-full overflow-hidden">{img}</div>
        </div>
        <span aria-hidden className="absolute -right-[2cqw] -top-[2cqw] flex size-[11cqw] rotate-12 items-center justify-center rounded-full border-[0.5cqw] border-double text-center text-[1.7cqw] font-bold uppercase leading-tight tracking-widest opacity-80" style={{ borderColor: t.accent, color: t.accent, background: t.paper }}>
          Par<br />avion
        </span>
        {caption && <figcaption className="mt-[1.8cqw] text-[2.7cqw] italic" style={{ color: t.muted }}>{caption}</figcaption>}
      </figure>
    );
  }
  // taped
  return (
    <figure className={cn("relative flex flex-col", className)} style={{ transform: `rotate(${tilt}deg)` }}>
      <span aria-hidden className="absolute -top-[1.6cqw] left-[12%] z-10 h-[3.6cqw] w-[13cqw] -rotate-6 bg-[#e8d9a8]/80 shadow-sm" />
      <span aria-hidden className="absolute -top-[1.4cqw] right-[10%] z-10 h-[3.6cqw] w-[11cqw] rotate-3 bg-[#e8d9a8]/80 shadow-sm" />
      <div className="min-h-0 flex-1 bg-white p-[1.3cqw] shadow-[0_0.5cqw_2cqw_rgba(0,0,0,0.22)]">
        <div className="h-full w-full overflow-hidden">{img}</div>
      </div>
      {caption && <figcaption className="hand mt-[1.6cqw] text-center text-[3.5cqw]" style={{ color: t.accent }}>{caption}</figcaption>}
    </figure>
  );
}

function Shell({ t, children, className, style, side }: { t: DiaryTemplate; children?: ReactNode; className?: string; style?: CSSProperties; side?: "left" | "right" }) {
  // The outer element is the query container and must carry no padding:
  // cqw units resolve against its content box.
  return (
    <div className="relative h-full w-full overflow-hidden [container-type:inline-size]" style={{ background: t.paper, color: t.ink }}>
      <div className={cn("absolute inset-0", className)} style={style}>
        {children}
      </div>
      {/* Gutter shadow towards the spine */}
      {side && (
        <span aria-hidden className={cn("pointer-events-none absolute inset-y-0 w-[9%]", side === "left" ? "right-0 bg-gradient-to-l" : "left-0 bg-gradient-to-r", "from-black/[0.13] to-transparent")} />
      )}
    </div>
  );
}

export function CoverFace({ diary, className }: { diary: Diary; className?: string }) {
  const t = getTemplate(diary.template);
  const h = headingClass(t);
  return (
    <div className={cn("relative h-full w-full overflow-hidden [container-type:inline-size]", className)} style={{ background: t.cover, color: t.coverInk }}>
      {t.photo === "bleed" && diary.coverPhoto && (
        <>
          <DiaryPhoto photo={diary.coverPhoto} alt="" className="absolute inset-0 h-full w-full" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/40" />
        </>
      )}
      {/* spine + cloth texture */}
      <span aria-hidden className="absolute inset-y-0 left-0 w-[6%] bg-gradient-to-r from-black/35 via-black/10 to-transparent" />
      <span aria-hidden className="absolute inset-[4cqw] border" style={{ borderColor: `${t.coverInk}55` }} />
      <div className="relative flex h-full flex-col items-center px-[10cqw] py-[10cqw] text-center">
        <p className="text-[2.4cqw] font-semibold uppercase tracking-[0.34em] opacity-80">{diary.destination || "A travel diary"}</p>
        {t.photo !== "bleed" && (
          <div className="mt-[6cqw] w-[62%]">
            {diary.coverPhoto ? (
              <div className={cn("aspect-[4/3] overflow-hidden", t.photo === "plain" ? "" : "bg-white p-[1.2cqw] shadow-[0_0.8cqw_3cqw_rgba(0,0,0,0.35)]", t.photo === "polaroid" && "rotate-[-2deg] pb-[4cqw]")}>
                <DiaryPhoto photo={diary.coverPhoto} alt="" className="h-full w-full" />
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center border border-dashed text-[2.4cqw] uppercase tracking-[0.2em] opacity-60" style={{ borderColor: t.coverInk }}>Cover photo</div>
            )}
          </div>
        )}
        <div className={cn("flex flex-1 flex-col items-center justify-center", t.photo === "bleed" && "justify-end pb-[4cqw]")}>
          <h3 className={cn(h, "text-[10.5cqw] leading-[0.95]", t.heading === "hand" && "text-[13cqw]")}>{diary.title || "Untitled diary"}</h3>
          {diary.subtitle && <p className={cn("mt-[3cqw] text-[3.3cqw] italic opacity-85", t.heading !== "sans" && "font-serif font-medium")}>{diary.subtitle}</p>}
        </div>
        <p className="text-[2.3cqw] uppercase tracking-[0.28em] opacity-75">{diary.author || "Your name"}</p>
      </div>
    </div>
  );
}

export function PageView({ page, diary, index, side }: { page: DiaryPage; diary: Diary; index: number; side?: "left" | "right" }) {
  const t = getTemplate(diary.template);
  const h = headingClass(t);
  const folio = (
    <p className={cn("absolute bottom-[4cqw] text-[2.1cqw] tabular tracking-[0.2em]", side === "left" ? "left-[8cqw]" : "right-[8cqw]")} style={{ color: t.muted }}>{index}</p>
  );

  switch (page.kind) {
    case "cover":
      return <CoverFace diary={diary} />;
    case "back":
      return (
        <div className="relative flex h-full w-full items-end justify-center [container-type:inline-size]" style={{ background: t.cover, color: t.coverInk }}>
          <span aria-hidden className="absolute inset-y-0 right-0 w-[6%] bg-gradient-to-l from-black/35 via-black/10 to-transparent" />
          <p className="pb-[10cqw] font-serif text-[3.4cqw] italic opacity-70">Destination Diaries</p>
        </div>
      );
    case "endpaper":
      return (
        <Shell t={t} side={side} style={{ backgroundImage: `radial-gradient(${t.accent}33 0.5cqw, transparent 0.6cqw)`, backgroundSize: "5cqw 5cqw" }} />
      );
    case "blank":
      return <Shell t={t} side={side} />;
    case "title":
      return (
        <Shell t={t} side={side} className="flex flex-col items-center justify-center px-[10cqw] text-center">
          <p className="text-[2.4cqw] font-semibold uppercase tracking-[0.32em]" style={{ color: t.accent }}>{diary.destination}</p>
          <h3 className={cn(h, "mt-[5cqw] text-[11cqw] leading-[0.95]", t.heading === "hand" && "text-[14cqw]")}>{diary.title || "Untitled diary"}</h3>
          {diary.subtitle && <p className="mt-[4cqw] font-serif text-[3.6cqw] font-medium italic">{diary.subtitle}</p>}
          <span aria-hidden className="my-[6cqw] h-px w-[14cqw]" style={{ background: t.accent }} />
          <p className="text-[2.6cqw]" style={{ color: t.muted }}>{dateSpan(diary.startDate, diary.endDate)}</p>
          <p className="mt-[1.5cqw] text-[2.6cqw]" style={{ color: t.muted }}>{diary.author}</p>
        </Shell>
      );
    case "contents":
      return (
        <Shell t={t} side={side} className="px-[10cqw] py-[12cqw]">
          <p className="text-[2.4cqw] font-semibold uppercase tracking-[0.32em]" style={{ color: t.accent }}>Contents</p>
          <ol className="mt-[7cqw] space-y-[4cqw]">
            {diary.chapters.map((c, i) => (
              <li key={c.id} className="flex items-baseline gap-[3cqw]">
                <span className="text-[2.4cqw] tabular" style={{ color: t.muted }}>{String(i + 1).padStart(2, "0")}</span>
                <span className={cn(h, "text-[4.8cqw] leading-tight", t.heading === "hand" && "text-[6cqw]")}>{c.title || "Untitled chapter"}</span>
              </li>
            ))}
          </ol>
          {folio}
        </Shell>
      );
    case "chapter": {
      const lead = page.chapter.photos[0];
      const meta = [page.chapter.place, formatDiaryDate(page.chapter.date)].filter(Boolean).join(" · ");
      if (t.photo === "bleed" && lead) {
        return (
          <Shell t={t} side={side} className="flex flex-col">
            <Framed photo={lead} t={t} className="h-[58%] w-full" />
            <div className="flex flex-1 flex-col justify-center px-[9cqw]">
              <p className="text-[2.3cqw] font-semibold uppercase tracking-[0.3em]" style={{ color: t.accent }}>Chapter {String(page.number).padStart(2, "0")}</p>
              <h3 className={cn(h, "mt-[2.5cqw] text-[9cqw] leading-[0.98]")}>{page.chapter.title || "Untitled chapter"}</h3>
              {meta && <p className="mt-[2.5cqw] text-[2.6cqw]" style={{ color: t.muted }}>{meta}</p>}
            </div>
            {folio}
          </Shell>
        );
      }
      return (
        <Shell t={t} side={side} className="flex flex-col px-[9cqw] pb-[10cqw] pt-[10cqw]">
          <p className="text-[2.3cqw] font-semibold uppercase tracking-[0.3em]" style={{ color: t.accent }}>Chapter {String(page.number).padStart(2, "0")}</p>
          <h3 className={cn(h, "mt-[2.5cqw] text-[9.5cqw] leading-[0.98]", t.heading === "hand" && "text-[12cqw]")}>{page.chapter.title || "Untitled chapter"}</h3>
          {meta && <p className="mt-[2.5cqw] text-[2.6cqw]" style={{ color: t.muted }}>{meta}</p>}
          {lead ? (
            <Framed photo={lead} t={t} tilt={page.number % 2 ? -1.5 : 1.5} className="mx-auto mt-[7cqw] min-h-0 w-[88%] flex-1" />
          ) : (
            <span aria-hidden className="mt-[6cqw] h-px w-[14cqw]" style={{ background: t.accent }} />
          )}
          {folio}
        </Shell>
      );
    }
    case "text":
      return (
        <Shell
          t={t}
          side={side}
          className="flex flex-col px-[9cqw] pb-[11cqw] pt-[10cqw]"
          style={t.ruled ? { backgroundImage: `linear-gradient(transparent calc(100% - 1px), ${t.ink}22 1px)`, backgroundSize: "100% 5.6cqw", backgroundPositionY: "10cqw" } : undefined}
        >
          <p className="text-[2cqw] uppercase tracking-[0.26em]" style={{ color: t.muted }}>{page.chapter.title}</p>
          <div className={cn("mt-[4.4cqw] space-y-[5.6cqw] text-[3.15cqw] leading-[5.6cqw]", t.heading === "sans" ? "font-sans" : "font-serif font-medium", t.heading === "hand" && "hand text-[4.3cqw]")}>
            {page.text.split(/\n\s*\n/).filter(Boolean).map((para, i) => (
              <p key={i} className={cn(i === 0 && page.note !== null && t.heading !== "hand" && "first-letter:float-left first-letter:pr-[1.4cqw] first-letter:text-[11cqw] first-letter:leading-[0.8]")}>{para}</p>
            ))}
          </div>
          {page.note && (
            <p className="hand mt-auto max-w-[80%] -rotate-2 self-end pt-[4cqw] text-right text-[4.4cqw]" style={{ color: t.accent }}>
              — {page.note}
            </p>
          )}
          {folio}
        </Shell>
      );
    case "photos":
      return (
        <Shell t={t} side={side} className={cn("flex flex-col gap-[5cqw]", t.photo === "bleed" ? "" : "px-[9cqw] pb-[11cqw] pt-[9cqw]")}>
          {page.photos.map((photo, i) => (
            <Framed key={photo.id} photo={photo} t={t} tilt={i % 2 ? 2 : -2} className={cn(
                t.photo !== "bleed" && page.photos.length === 1 ? "my-auto aspect-[5/4] flex-none" : "min-h-0 flex-1",
                t.photo !== "bleed" && page.photos.length > 1 && (i % 2 ? "ml-[8%]" : "mr-[8%]"),
              )} />
          ))}
          {t.photo !== "bleed" && folio}
        </Shell>
      );
    case "end":
      return (
        <Shell t={t} side={side} className="flex flex-col items-center justify-center px-[10cqw] text-center">
          <p className="hand text-[11cqw] leading-none" style={{ color: t.accent }}>Until next time</p>
          <span aria-hidden className="my-[5cqw] h-px w-[14cqw]" style={{ background: t.accent }} />
          <p className="text-[2.5cqw] uppercase tracking-[0.28em]" style={{ color: t.muted }}>{diary.destination}</p>
        </Shell>
      );
  }
}
