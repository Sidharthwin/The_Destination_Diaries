import type { Metadata } from "next";
import { ChapterEditor } from "@/components/diary/chapter-editor";

export const metadata: Metadata = { title: "Edit chapter" };

export default async function ChapterPage({ params }: PageProps<"/diaries/[id]/chapters/[chapterId]">) {
  const { id, chapterId } = await params;
  return <ChapterEditor id={id} chapterId={chapterId} />;
}
