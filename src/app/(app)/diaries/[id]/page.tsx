import type { Metadata } from "next";
import { DiaryEditor } from "@/components/diary/diary-editor";

export const metadata: Metadata = { title: "Edit diary" };

export default async function DiaryPage({ params }: PageProps<"/diaries/[id]">) {
  return <DiaryEditor id={(await params).id} />;
}
