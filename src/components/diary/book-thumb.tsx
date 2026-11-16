import type { Diary } from "@/lib/diary/types";
import { cn } from "@/lib/utils";
import { CoverFace } from "./page-view";

/** A closed book with a page block and a slight 3D lean on hover. */
export function BookThumb({ diary, className }: { diary: Diary; className?: string }) {
  return (
    <div className={cn("group/book relative aspect-[3/4] [perspective:1200px]", className)}>
      <div className="relative h-full w-full origin-left transition-transform duration-500 ease-out [transform-style:preserve-3d] group-hover/book:[transform:rotateY(-18deg)] motion-reduce:transition-none">
        {/* page block */}
        <span aria-hidden className="absolute inset-y-[1.5%] -right-[3%] w-[5%] rounded-r-sm bg-[repeating-linear-gradient(90deg,#f4eedf_0_1px,#d9cfb8_1px_2px)]" />
        <div className="absolute inset-0 overflow-hidden rounded-r-[4px] rounded-l-[2px] shadow-[0_14px_30px_-14px_rgba(0,0,0,0.6),0_2px_4px_rgba(0,0,0,0.2)]">
          <CoverFace diary={diary} />
        </div>
      </div>
    </div>
  );
}
