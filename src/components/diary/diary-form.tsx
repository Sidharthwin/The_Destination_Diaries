"use client";

import { Check, ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACCEPTED_IMAGE_TYPES, addMedia } from "@/lib/diary/store";
import { TEMPLATES } from "@/lib/diary/templates";
import type { Diary, PhotoRef } from "@/lib/diary/types";
import { cn } from "@/lib/utils";
import { DiaryPhoto } from "./diary-photo";

export type DiaryFields = Pick<Diary, "title" | "subtitle" | "author" | "destination" | "startDate" | "endDate" | "template" | "coverPhoto">;

/** The fields that define a diary's cover and identity. Used when creating and when editing. */
export function DiaryForm({ value, onChange, coverChoices = [] }: {
  value: DiaryFields;
  onChange: (patch: Partial<DiaryFields>) => void;
  /** Photos already in the diary that could be used as the cover. */
  coverChoices?: PhotoRef[];
}) {
  const file = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <Label htmlFor="d-title">Title</Label>
        <Input id="d-title" value={value.title} maxLength={80} onChange={(e) => onChange({ title: e.target.value })} placeholder="e.g. Ten days in the hills" className="h-12 bg-paper font-serif text-2xl" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="d-subtitle">Subtitle <span className="font-normal text-ink-soft">(optional)</span></Label>
        <Input id="d-subtitle" value={value.subtitle} maxLength={120} onChange={(e) => onChange({ subtitle: e.target.value })} className="h-11 bg-paper" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="d-dest">Where</Label>
          <Input id="d-dest" value={value.destination} maxLength={80} onChange={(e) => onChange({ destination: e.target.value })} placeholder="e.g. Hampi, Karnataka" className="h-11 bg-paper" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="d-author">Written by</Label>
          <Input id="d-author" value={value.author} maxLength={60} onChange={(e) => onChange({ author: e.target.value })} className="h-11 bg-paper" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="d-start">From</Label>
          <Input id="d-start" type="date" value={value.startDate} onChange={(e) => onChange({ startDate: e.target.value, ...(value.endDate && value.endDate < e.target.value ? { endDate: e.target.value } : {}) })} className="h-11 bg-paper" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="d-end">To</Label>
          <Input id="d-end" type="date" min={value.startDate || undefined} value={value.endDate} onChange={(e) => onChange({ endDate: e.target.value })} className="h-11 bg-paper" />
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Style</legend>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {TEMPLATES.map((t) => {
            const on = value.template === t.id;
            return (
              <button key={t.id} type="button" aria-pressed={on} onClick={() => onChange({ template: t.id })}
                className={cn("flex items-center gap-3 border p-3 text-left transition-colors", on ? "border-forest bg-paper ring-1 ring-forest" : "border-border bg-paper hover:border-forest/60")}>
                <span aria-hidden className="flex h-12 w-9 shrink-0 items-end justify-end rounded-r-sm p-1 shadow-sm" style={{ background: t.cover }}>
                  <span className="h-3 w-full" style={{ background: t.paper }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{t.name}</span>
                  <span className="block text-xs leading-snug text-ink-soft">{t.tagline}</span>
                </span>
                {on && <Check aria-hidden className="size-4 shrink-0 text-forest" />}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Cover photograph</legend>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {value.coverPhoto && (
            <span className="relative block h-20 w-28 overflow-hidden border border-border">
              <DiaryPhoto photo={value.coverPhoto} alt="Current cover" className="h-full w-full" />
              <button type="button" aria-label="Remove cover photograph" onClick={() => onChange({ coverPhoto: null })} className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-ink/75 text-cream"><X className="size-3.5" /></button>
            </span>
          )}
          <button type="button" disabled={uploading} onClick={() => file.current?.click()} className="inline-flex h-20 items-center gap-2 border border-dashed border-ink/30 px-5 text-sm font-semibold text-ink-soft hover:border-forest hover:text-forest">
            <ImagePlus aria-hidden className="size-5" /> {uploading ? "Adding…" : value.coverPhoto ? "Choose another" : "Upload a photo"}
          </button>
          <input ref={file} type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} className="sr-only" aria-label="Upload a cover photograph"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setUploading(true);
              setUploadError(null);
              try {
                onChange({ coverPhoto: await addMedia(f) });
              } catch (err) {
                setUploadError(err instanceof Error ? err.message : "That photo could not be added.");
              } finally {
                setUploading(false);
              }
            }} />
        </div>
        {coverChoices.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-ink-soft">Or pick one already in this diary:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {coverChoices.map((p) => (
                <button key={p.id} type="button" aria-label={`Use ${p.caption || "this photo"} as the cover`} aria-pressed={value.coverPhoto?.mediaId === p.mediaId && value.coverPhoto?.src === p.src}
                  onClick={() => onChange({ coverPhoto: p })} className="h-14 w-20 overflow-hidden border border-border hover:border-forest aria-pressed:ring-2 aria-pressed:ring-forest">
                  <DiaryPhoto photo={p} alt="" className="h-full w-full" />
                </button>
              ))}
            </div>
          </div>
        )}
        {uploadError && <p role="alert" className="mt-2 text-sm text-destructive">{uploadError}</p>}
      </fieldset>
    </div>
  );
}
