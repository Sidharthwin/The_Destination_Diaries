import type { Metadata } from "next";
import { DiaryReader } from "@/components/diary/diary-reader";

export const metadata: Metadata = { title: "Read" };

export default async function ReadPage({ params }: PageProps<"/diaries/[id]/read">) {
  return <DiaryReader id={(await params).id} />;
}
