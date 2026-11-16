import type { Metadata } from "next";
import { Shelf } from "@/components/diary/shelf";

export const metadata: Metadata = { title: "My diaries" };

export default function DiariesPage() {
  return <Shelf />;
}
