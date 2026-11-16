"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { newId, type Diary, type PhotoRef } from "./types";

/**
 * Diaries are saved in this browser (IndexedDB): the diary documents in one
 * store and uploaded photos, resized, in another. Nothing is sent to a server.
 */

const DB_NAME = "destination-diaries";
const DIARIES = "diaries";
const MEDIA = "media";

interface State {
  ready: boolean;
  diaries: Diary[];
  error: string | null;
}

let state: State = { ready: false, diaries: [], error: null };
const SERVER_STATE: State = { ready: false, diaries: [], error: null };
const listeners = new Set<() => void>();
let dbPromise: Promise<IDBDatabase> | null = null;

function emit(next: Partial<State>) {
  state = { ...state, ...next };
  for (const l of listeners) l();
}

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DIARIES, { keyPath: "id" });
      req.result.createObjectStore(MEDIA);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function request<T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = run(tx.objectStore(store));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

let loading = false;
function load() {
  if (loading || typeof indexedDB === "undefined") return;
  loading = true;
  request<Diary[]>(DIARIES, "readonly", (s) => s.getAll())
    .then((diaries) => emit({ ready: true, diaries: diaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) }))
    .catch(() => emit({ ready: true, error: "Your browser is blocking storage, so diaries cannot be saved here." }));
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  load();
  return () => listeners.delete(cb);
}

export function useDiaryStore(): State {
  return useSyncExternalStore(subscribe, () => state, () => SERVER_STATE);
}

export async function saveDiary(diary: Diary): Promise<Diary> {
  const next = { ...diary, updatedAt: new Date().toISOString() };
  await request(DIARIES, "readwrite", (s) => s.put(next));
  emit({ diaries: [next, ...state.diaries.filter((d) => d.id !== next.id)] });
  return next;
}

function mediaIds(diary: Diary): string[] {
  return [diary.coverPhoto, ...diary.library, ...diary.chapters.flatMap((c) => c.photos)]
    .map((p) => p?.mediaId)
    .filter((id): id is string => Boolean(id));
}

export async function deleteDiary(id: string): Promise<void> {
  const diary = state.diaries.find((d) => d.id === id);
  await request(DIARIES, "readwrite", (s) => s.delete(id));
  if (diary) await Promise.all([...new Set(mediaIds(diary))].map((m) => deleteMedia(m)));
  emit({ diaries: state.diaries.filter((d) => d.id !== id) });
}

// ── Media ──

const urlCache = new Map<string, string>();
const MAX_EDGE = 1600;

/** Resizes an image in the browser so storage stays small; returns a JPEG blob. */
async function resize(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", 0.84),
  );
}

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export async function addMedia(file: File): Promise<PhotoRef> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new Error(`${file.name}: only JPEG, PNG or WebP photos can be added.`);
  if (file.size > MAX_UPLOAD_BYTES) throw new Error(`${file.name}: photos must be under 25 MB.`);
  let blob: Blob;
  try {
    blob = await resize(file);
  } catch {
    throw new Error(`${file.name}: this file could not be read as a photo.`);
  }
  const mediaId = newId();
  await request(MEDIA, "readwrite", (s) => s.put(blob, mediaId));
  urlCache.set(mediaId, URL.createObjectURL(blob));
  return { id: newId(), mediaId, caption: "" };
}

export async function deleteMedia(mediaId: string): Promise<void> {
  await request(MEDIA, "readwrite", (s) => s.delete(mediaId));
  const url = urlCache.get(mediaId);
  if (url) URL.revokeObjectURL(url);
  urlCache.delete(mediaId);
}

async function mediaUrl(mediaId: string): Promise<string | null> {
  const cached = urlCache.get(mediaId);
  if (cached) return cached;
  const blob = await request<Blob | undefined>(MEDIA, "readonly", (s) => s.get(mediaId));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(mediaId, url);
  return url;
}

/** Resolves a photo to something an <img> can show. `null` while loading; `""` if missing. */
export function usePhotoUrl(photo: PhotoRef | null | undefined): string | null {
  const mediaId = photo?.mediaId;
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    if (!mediaId || urlCache.has(mediaId)) return;
    let cancelled = false;
    mediaUrl(mediaId)
      .then((url) => !cancelled && setLoaded({ id: mediaId, url: url ?? "" }))
      .catch(() => !cancelled && setLoaded({ id: mediaId, url: "" }));
    return () => {
      cancelled = true;
    };
  }, [mediaId]);
  if (!photo) return "";
  if (photo.src) return photo.src;
  if (!mediaId) return "";
  return urlCache.get(mediaId) ?? (loaded?.id === mediaId ? loaded.url : null);
}
