"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { RouteSketch, type SketchPoint } from "./route-sketch";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const GROUP_COLORS = ["#173d32", "#a84e33", "#5a6b2f", "#2f5d7c", "#7a4a6b", "#8a6a1f", "#3f6f66"];

interface Props {
  points: SketchPoint[];
  activeId?: string | null;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
  className?: string;
}

/**
 * Interactive Mapbox GL map with numbered markers and a route line per day.
 * Without a public Mapbox token it falls back to a schematic route drawing,
 * so the product stays usable and honest about what it is showing.
 */
export function TripMap(props: Props) {
  const [failed, setFailed] = useState(false);
  if (!TOKEN || failed) {
    return (
      <div className={cn("relative", props.className)}>
        <RouteSketch {...props} className="absolute inset-0" />
        <p className="absolute bottom-2 left-3 right-3 text-[11px] leading-snug text-ink-soft">
          Schematic view — positions are to scale, without a base map.
          {!TOKEN && " Add NEXT_PUBLIC_MAPBOX_TOKEN for the full interactive map."}
        </p>
      </div>
    );
  }
  return <MapboxMap {...props} onFail={() => setFailed(true)} />;
}

function MapboxMap({ points, activeId, onHover, onSelect, className, onFail }: Props & { onFail: () => void }) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markers = useRef(new Map<string, { marker: import("mapbox-gl").Marker; node: HTMLElement; color: string }>());
  const [ready, setReady] = useState(false);
  const handlers = useRef({ onHover, onSelect });
  handlers.current = { onHover, onSelect };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        await import("mapbox-gl/dist/mapbox-gl.css");
        if (cancelled || !el.current) return;
        mapboxgl.accessToken = TOKEN;
        const map = new mapboxgl.Map({
          container: el.current,
          style: "mapbox://styles/mapbox/outdoors-v12",
          center: [78.9, 22.5],
          zoom: 3.5,
          attributionControl: true,
          cooperativeGestures: true,
        });
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => !cancelled && setReady(true));
        map.on("error", (e) => {
          const status = (e.error as { status?: number } | undefined)?.status;
          if (status === 401 || status === 403) onFail();
        });
        mapRef.current = map;
      } catch {
        onFail();
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onFail]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let disposed = false;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (disposed) return;
      for (const m of markers.current.values()) m.marker.remove();
      markers.current.clear();

      const groups = new Map<number, SketchPoint[]>();
      for (const p of points) groups.set(p.group ?? 0, [...(groups.get(p.group ?? 0) ?? []), p]);

      const features = [...groups.entries()].map(([g, pts]) => ({
        type: "Feature" as const,
        properties: { color: GROUP_COLORS[g % GROUP_COLORS.length] },
        geometry: { type: "LineString" as const, coordinates: pts.map((p) => [p.lng, p.lat]) },
      }));
      const data = { type: "FeatureCollection" as const, features };
      const source = map.getSource("routes") as import("mapbox-gl").GeoJSONSource | undefined;
      if (source) source.setData(data);
      else {
        map.addSource("routes", { type: "geojson", data });
        map.addLayer({
          id: "routes",
          type: "line",
          source: "routes",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ["get", "color"], "line-width": 2.5, "line-dasharray": [0.5, 2] },
        });
      }

      for (const [g, pts] of groups) {
        pts.forEach((p, i) => {
          const color = GROUP_COLORS[g % GROUP_COLORS.length];
          const node = document.createElement("button");
          node.type = "button";
          node.textContent = pts.length > 1 ? String(i + 1) : "";
          node.setAttribute("aria-label", p.label);
          node.title = p.label;
          node.style.cssText = `width:28px;height:28px;border-radius:9999px;border:2.5px solid #fbf8f1;background:${color};color:#fbf8f1;font:700 12px/1 system-ui;cursor:pointer;transition:transform 150ms ease, background 150ms ease;box-shadow:0 2px 6px rgba(0,0,0,.3)`;
          node.addEventListener("mouseenter", () => handlers.current.onHover?.(p.id));
          node.addEventListener("mouseleave", () => handlers.current.onHover?.(null));
          node.addEventListener("click", () => handlers.current.onSelect?.(p.id));
          const marker = new mapboxgl.Marker({ element: node }).setLngLat([p.lng, p.lat]).addTo(map);
          markers.current.set(p.id, { marker, node, color });
        });
      }

      if (points.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        for (const p of points) bounds.extend([p.lng, p.lat]);
        map.fitBounds(bounds, { padding: 64, maxZoom: 14.5, duration: 600 });
      }
    })();
    return () => {
      disposed = true;
    };
  }, [points, ready]);

  useEffect(() => {
    for (const [id, m] of markers.current) {
      const on = id === activeId;
      m.node.style.transform = `${m.node.style.transform.replace(/ scale\([^)]*\)/, "")} scale(${on ? 1.35 : 1})`;
      m.node.style.background = on ? "#d97757" : m.color;
      m.node.style.zIndex = on ? "5" : "1";
    }
  }, [activeId, points, ready]);

  return <div ref={el} className={cn("h-full w-full bg-sand-soft", className)} />;
}
