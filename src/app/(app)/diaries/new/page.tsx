import type { Metadata } from "next";
import { CreateDiary } from "@/components/diary/create-diary";
import { requireUserPage } from "@/server/auth/session";

export const metadata: Metadata = { title: "New diary" };

export default async function NewDiaryPage() {
  const user = await requireUserPage("/diaries/new");
  return <CreateDiary defaultAuthor={user.displayName ?? ""} />;
}
