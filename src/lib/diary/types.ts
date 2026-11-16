export type TemplateId = "journal" | "fieldnotes" | "postcard" | "monsoon" | "atlas";

/** A photo is either a bundled image (`src`) or one the user uploaded (`mediaId`, stored in the browser). */
export interface PhotoRef {
  id: string;
  src?: string;
  mediaId?: string;
  caption?: string;
  credit?: string;
}

export interface Chapter {
  id: string;
  title: string;
  place: string;
  /** ISO date or "" */
  date: string;
  body: string;
  /** A short handwritten aside shown in the margin. */
  note: string;
  photos: PhotoRef[];
}

export interface Diary {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  destination: string;
  startDate: string;
  endDate: string;
  template: TemplateId;
  coverPhoto: PhotoRef | null;
  chapters: Chapter[];
  /** Photos uploaded to this diary but not yet placed in a chapter. */
  library: PhotoRef[];
  /** Bundled example diaries are read-only. */
  sample?: boolean;
  slug?: string;
  createdAt: string;
  updatedAt: string;
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
