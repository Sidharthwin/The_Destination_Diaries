"use client";

import { useDiaryStore } from "@/lib/diary/store";

export function useDiary(id: string) {
  const store = useDiaryStore();
  return { ready: store.ready, error: store.error, diary: store.diaries.find((d) => d.id === id) ?? null };
}
