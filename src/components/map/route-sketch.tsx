"use client";

import { cn } from "@/lib/utils";

export interface SketchPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  /** Points sharing a group are joined by a route line, in order. */
  group?: number;
}

const GROUP_COLORS = ["#173d32", "#a84e33", "#5a6b2f", "#2f5d7c", "#7a4a6b", "#8a6a1f", "#3f6f66"];

/**
 * A schematic route drawing: real coordinates projected onto a plain canvas,
 * with no base map. Used on marketing pages and as the fallback wherever a
 * Mapbox token is not configured.
 */
export function RouteSketch({
  points,
  activeId,
  onHover,
  onSelect,
  className,
}: {
  points: SketchPoint[];
  activeId?: string | null;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  const W = 600;
  const H = 440;
  const pad = 48;
  if (points.length === 0) {
    return (
      <div className={cn("flex items-center justify-center bg-sand-soft text-sm text-ink-soft", className)}>
        No stops to show yet.
      </div>
    );
  }
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const minX = Math.min(...lngs) * kx;
  const maxX = Math.max(...lngs) * kx;
  const minY = Math.min(...lats);
  const maxY = Math.max(...lats);
  const scale = Math.min((W - pad * 2) / Math.max(maxX - minX, 1e-6), (H - pad * 2) / Math.max(maxY - minY, 1e-6));
  const offX = (W - (maxX - minX) * scale) / 2;
  const offY = (H - (maxY - minY) * scale) / 2;
  const project = (p: SketchPoint) => ({
    x: offX + (p.lng * kx - minX) * scale,
    y: H - offY - (p.lat - minY) * scale,
  });

  const groups = new Map<number, SketchPoint[]>();
  for (const p of points) groups.set(p.group ?? 0, [...(groups.get(p.group ?? 0) ?? []), p]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Schematic route through ${points.length} stops`}
      className={cn("h-full w-full bg-sand-soft", className)}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id="sketch-grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M30 0H0V30" fill="none" stroke="#d8c9a9" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#sketch-grid)" />
      {[...groups.entries()].map(([g, pts]) => (
        <polyline
          key={g}
          points={pts.map((p) => { const { x, y } = project(p); return `${x},${y}`; }).join(" ")}
          fill="none"
          stroke={GROUP_COLORS[g % GROUP_COLORS.length]}
          strokeWidth="2"
          strokeDasharray="1 7"
          strokeLinecap="round"
        />
      ))}
      {[...groups.entries()].flatMap(([g, pts]) =>
        pts.map((p, i) => {
          const { x, y } = project(p);
          const active = activeId === p.id;
          const color = GROUP_COLORS[g % GROUP_COLORS.length];
          return (
            <g
              key={p.id}
              transform={`translate(${x} ${y})`}
              className={cn(onSelect && "cursor-pointer")}
              onMouseEnter={() => onHover?.(p.id)}
              onMouseLeave={() => onHover?.(null)}
              onClick={() => onSelect?.(p.id)}
            >
              <title>{p.label}</title>
              <circle r={active ? 17 : 12} fill={active ? "#d97757" : color} stroke="#fbf8f1" strokeWidth="2.5" style={{ transition: "r 200ms ease, fill 200ms ease" }} />
              <text textAnchor="middle" dy="4" fontSize="11" fontWeight="700" fill="#fbf8f1" style={{ pointerEvents: "none" }}>
                {pts.length > 1 ? i + 1 : ""}
              </text>
              {active && (
                <text textAnchor={x > W * 0.65 ? "end" : "start"} x={x > W * 0.65 ? -22 : 22} dy="4" fontSize="13" fontWeight="600" fill="#252923" stroke="#ebe4d3" strokeWidth="4" paintOrder="stroke">
                  {p.label}
                </text>
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
}
