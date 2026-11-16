"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { BookViewer } from "./book-viewer";
import { DiaryMissing } from "./diary-states";
import { useDiary } from "./use-diary";

export function DiaryReader({ id }: { id: string }) {
  const { ready, diary, error } = useDiary(id);
  if (ready && !diary) return <DiaryMissing error={error} />;
  return (
    <div className="flex flex-1 flex-col bg-[#1a2420] px-5 pb-12 pt-6 text-cream sm:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <Link href={`/diaries/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-cream/80 hover:text-cream"><ArrowLeft aria-hidden className="size-4" /> Back to editing</Link>
        <h1 className="truncate font-serif text-2xl">{diary?.title ?? ""}</h1>
        <Link href={`/diaries/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-cream/80 hover:text-cream"><Pencil aria-hidden className="size-4" /> Edit</Link>
      </div>
      {diary ? <BookViewer diary={diary} className="mx-auto mt-8 w-full max-w-7xl" /> : <p className="mt-16 text-center text-sm text-cream/60" aria-busy="true">Opening the book…</p>}
    </div>
  );
}
