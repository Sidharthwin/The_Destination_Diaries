"use client";

import { useState } from "react";
import type { SketchPoint } from "@/components/map/route-sketch";
import { TripMap } from "@/components/map/trip-map";

/** Unconnected markers; selecting one scrolls to its listing. */
export function DestinationMap({ points }: { points: SketchPoint[] }) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <TripMap
      className="h-full w-full"
      points={points.map((p, i) => ({ ...p, group: i }))}
      activeId={active}
      onHover={setActive}
      onSelect={(id) => document.getElementById(`place-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
    />
  );
}
