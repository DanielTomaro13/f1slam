"use client";
import { useMemo } from "react";
import type { Track } from "@/lib/f1";

/**
 * Renders a circuit's outline from its MultiViewer x/y polyline as an SVG.
 * Optionally animates a marker (a car) travelling around the lap, and can place
 * extra car markers at fixed fractions of the lap (used by the race sim).
 */
export interface CarMarker { id: string; t: number; colour: string } // t = 0..1 around lap
export interface Racer { colour: string; offset: number } // offset 0..1 of a lap

export default function TrackMap({
  track,
  height = 220,
  stroke = "var(--accent)",
  animate = false,
  lapSeconds = 6,
  cars,
  racers,
  showStartFinish = true,
}: {
  track: Track;
  height?: number;
  stroke?: string;
  animate?: boolean;
  lapSeconds?: number;
  cars?: CarMarker[];
  racers?: Racer[];
  showStartFinish?: boolean;
}) {
  const geo = useMemo(() => {
    if (!track?.x?.length) return null;
    const rot = ((track.rotation || 0) * Math.PI) / 180;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    const pts = track.x.map((x, i) => {
      const y = track.y[i];
      return [x * cos - y * sin, x * sin + y * cos] as [number, number];
    });
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = maxX - minX || 1, h = maxY - minY || 1;
    const pad = Math.max(w, h) * 0.08;
    const vb = `${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}`;
    const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";
    const len = Math.max(w, h);
    return { d, vb, start: pts[0], pts, len };
  }, [track]);

  if (!geo) {
    return (
      <div style={{ height, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: ".85rem" }}>
        Track map unavailable
      </div>
    );
  }

  const sw = geo.len * 0.018;

  return (
    <svg viewBox={geo.vb} style={{ width: "100%", height, display: "block" }} role="img" aria-label={`${track.name} circuit map`}>
      {/* track bed */}
      <path d={geo.d} fill="none" stroke="var(--panel-2)" strokeWidth={sw * 2.2} strokeLinejoin="round" strokeLinecap="round" />
      <path d={geo.d} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" opacity={0.95} />

      {showStartFinish && (
        <circle cx={geo.start[0]} cy={geo.start[1]} r={sw * 1.6} fill="var(--gold)" stroke="#000" strokeWidth={sw * 0.3} />
      )}

      {/* single animated car (offsetPath would be ideal but viewBox units vary; use SM) */}
      {animate && (
        <circle r={sw * 1.8} fill={stroke}>
          <animateMotion dur={`${lapSeconds}s`} repeatCount="indefinite" path={geo.d} rotate="auto" />
        </circle>
      )}

      {/* fixed grid of cars at lap fractions (race sim positions) */}
      {cars?.map((c) => {
        const idx = Math.min(geo.pts.length - 1, Math.floor((c.t % 1) * geo.pts.length));
        const p = geo.pts[idx];
        return <circle key={c.id} cx={p[0]} cy={p[1]} r={sw * 1.7} fill={c.colour} stroke="#000" strokeWidth={sw * 0.25} />;
      })}

      {/* a pack of cars animating around the lap, spread out by offset */}
      {racers?.map((rc, i) => (
        <circle key={i} r={sw * 1.5} fill={rc.colour} stroke="#000" strokeWidth={sw * 0.25}>
          <animateMotion dur={`${lapSeconds}s`} begin={`${-rc.offset * lapSeconds}s`} repeatCount="indefinite" path={geo.d} rotate="auto" />
        </circle>
      ))}
    </svg>
  );
}
