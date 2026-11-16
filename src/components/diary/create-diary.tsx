"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { pill } from "@/components/layout/button-link";
import { saveDiary } from "@/lib/diary/store";
import { newId, type Diary } from "@/lib/diary/types";
import { DiaryForm, type DiaryFields } from "./diary-form";
import { CoverFace } from "./page-view";

export function CreateDiary({ defaultAuthor }: { defaultAuthor: string }) {
  const router = useRouter();
  const [fields, setFields] = useState<DiaryFields>({
    title: "", subtitle: "", author: defaultAuthor, destination: "", startDate: "", endDate: "", template: "journal", coverPhoto: null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview: Diary = { ...fields, id: "preview", chapters: [], library: [], createdAt: "", updatedAt: "" };

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.title.trim()) return setError("Give your diary a title — you can change it later.");
    setBusy(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const diary = await saveDiary({
        ...fields,
        title: fields.title.trim(),
        id: newId(),
        library: [],
        chapters: [{ id: newId(), title: "The first day", place: fields.destination, date: fields.startDate, body: "", note: "", photos: [] }],
        createdAt: now,
        updatedAt: now,
      });
      router.push(`/diaries/${diary.id}`);
    } catch {
      setError("This diary could not be saved. Your browser may be blocking storage for this site.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <form onSubmit={create} noValidate>
        <p className="kicker">A new diary</p>
        <h1 className="mt-3 text-5xl sm:text-6xl">Begin with the <span className="italic">cover</span></h1>
        <p className="mt-3 max-w-xl text-ink-soft">Watch it take shape as you type. Everything here can be changed later.</p>
        <div className="mt-10"><DiaryForm value={fields} onChange={(patch) => { setFields((f) => ({ ...f, ...patch })); setError(null); }} /></div>
        {error && <p role="alert" className="mt-6 text-sm font-medium text-destructive">{error}</p>}
        <button type="submit" disabled={busy} className={pill("accent", "lg", "mt-8")}>{busy ? "Binding…" : "Create diary"}</button>
      </form>
      <aside aria-label="Cover preview" className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Live preview</p>
        <div className="mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-r-md rounded-l-sm shadow-[0_30px_60px_-25px_rgba(0,0,0,0.6)]">
          <CoverFace diary={preview} />
        </div>
      </aside>
    </div>
  );
}
