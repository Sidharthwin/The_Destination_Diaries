import type { Metadata } from "next";
import { MediaManager } from "@/components/diary/media-manager";

export const metadata: Metadata = { title: "Photographs" };

export default async function MediaPage({ params }: PageProps<"/diaries/[id]/media">) {
  return <MediaManager id={(await params).id} />;
}
