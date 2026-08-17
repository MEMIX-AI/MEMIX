"use client";

import { useState } from "react";
import type { PointerEvent } from "react";

// A single-series trend line for one Creator Analytics metric (Views/
// Downloads/Earnings) — always exactly one real series, so no legend (see
// dataviz skill: "a single series needs no legend box, the card's own
// label already says what's plotted"). Baseline is always 0 (counts and
// $MIX sums are never negative). Ships a real hover layer (crosshair +
// tooltip) rather than a static image — per the skill, that's the default
// for an HTML line chart, not an upgrade; the one gap against the full
// spec is keyboard-focus parity, skipped here since the headline total
// next to this chart already carries the un-gated number.
export function AnalyticsSparkline({
  points,
  color,
  formatValue,
  width = 240,
  height = 48,
}: {
  points: { date: string; value: number }[];
  /** A CSS color value, e.g. "var(--accent)" — one metric, one hue. */
  color: string;
  formatValue?: (value: number) => string;
  width?: number;
  height?: number;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  if (points.length === 0) return null;

  const max = Math.max(...points.map((p) => p.value), 1);
  const padY = 5;
  const stepX = points.length > 1 ? width / (points.length - 1) : 0;
  const scaleY = (v: number) => height - padY - (v / max) * (height - padY * 2);

  const coords = points.map((p, i): [number, number] => [i * stepX, scaleY(p.value)]);
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1];
  const hovered = hoverIndex != null ? points[hoverIndex] : null;
  const hoveredCoord = hoverIndex != null ? coords[hoverIndex] : null;

  function handleMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const idx = Math.max(0, Math.min(points.length - 1, Math.round(ratio * (points.length - 1))));
    setHoverIndex(idx);
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        onPointerMove={handleMove}
        onPointerLeave={() => setHoverIndex(null)}
        className="block overflow-visible"
      >
        {hoveredCoord && (
          <line x1={hoveredCoord[0]} y1={0} x2={hoveredCoord[0]} y2={height} stroke="var(--line)" strokeWidth={1} />
        )}
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={last[0]} cy={last[1]} r={4} fill={color} stroke="var(--panel-solid)" strokeWidth={2} />
        {hoveredCoord && (
          <circle cx={hoveredCoord[0]} cy={hoveredCoord[1]} r={4} fill={color} stroke="var(--panel-solid)" strokeWidth={2} />
        )}
      </svg>
      {hovered && hoveredCoord && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-line bg-panel-solid px-2 py-1 text-[11px] shadow-soft"
          style={{ left: hoveredCoord[0], top: -4, transform: `translate(-50%, -100%)` }}
        >
          <p className="font-semibold text-text">{formatValue ? formatValue(hovered.value) : hovered.value}</p>
          <p className="text-faint">{hovered.date}</p>
        </div>
      )}
    </div>
  );
}
