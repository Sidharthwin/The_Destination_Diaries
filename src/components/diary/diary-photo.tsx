"use client";

import { ImageOff } from "lucide-react";
import { usePhotoUrl } from "@/lib/diary/store";
import type { PhotoRef } from "@/lib/diary/types";
import { cn } from "@/lib/utils";

/** Shows a bundled or browser-stored photo. Plain <img>: sources can be blob URLs. */
export function DiaryPhoto({ photo, alt, className }: { photo: PhotoRef | null | undefined; alt?: string; className?: string }) {
  const url = usePhotoUrl(photo);
  if (url === null) return <div className={cn("animate-pulse bg-black/10", className)} aria-hidden />;
  if (url === "") {
    return (
      <div className={cn("flex items-center justify-center bg-black/10 text-current/50", className)} role="img" aria-label="Photo unavailable">
        <ImageOff className="size-[18%] opacity-40" aria-hidden />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt ?? photo?.caption ?? ""} className={cn("object-cover", className)} loading="lazy" draggable={false} />;
}
