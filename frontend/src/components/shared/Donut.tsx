"use client";

import { useState } from "react";

export interface DonutSegment {
  label: string;
  count: number;
  color: string;
}

const SIZE = 160;
const STROKE = 32;
const HOVER_STROKE = 36;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP_DEGREES = 3; // visual separation between segments, in addition to the surface-color gap
const MIN_LABEL_PERCENT = 6; // below this the slice is too thin for a legible inline label

interface TooltipState {
  label: string;
  count: number;
  percent: number;
  x: number;
  y: number;
}

/** Point on the ring at `degrees` clockwise from 12 o'clock. */
function pointAt(degrees: number, radius: number) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.sin(radians),
    y: CENTER - radius * Math.cos(radians),
  };
}

export function Donut({
  segments,
  total,
  centerValue,
  centerLabel,
  showDirectLabels = false,
}: {
  segments: DonutSegment[];
  total: number;
  centerValue: number;
  centerLabel: string;
  showDirectLabels?: boolean;
}) {
  const visible = segments.filter((s) => s.count > 0);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  let cumulativeDegrees = 0;

  const showTooltip = (segment: DonutSegment, x: number, y: number) => {
    setTooltip({
      label: segment.label,
      count: segment.count,
      percent: total > 0 ? Math.round((segment.count / total) * 100) : 0,
      x,
      y,
    });
  };

  return (
    <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} onMouseLeave={() => setTooltip(null)}>
        {/* Track: shows even when there's no data yet */}
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="var(--muted)" strokeWidth={STROKE} />

        {total > 0 &&
          visible.map((segment) => {
            const fraction = segment.count / total;
            const segmentDegrees = fraction * 360;
            const startDegrees = cumulativeDegrees;
            const drawableDegrees = Math.max(segmentDegrees - (visible.length > 1 ? GAP_DEGREES : 0), 0);
            const dashLength = (drawableDegrees / 360) * CIRCUMFERENCE;
            // Circle paths start at 3 o'clock in SVG; rotate -90deg so 0deg is 12 o'clock.
            const dashOffset = -((startDegrees / 360) * CIRCUMFERENCE);
            cumulativeDegrees += segmentDegrees;
            const isHovered = tooltip?.label === segment.label;
            const percent = Math.round(fraction * 100);
            const labelPoint = pointAt(startDegrees + segmentDegrees / 2, RADIUS);

            return (
              <g key={segment.label}>
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={isHovered ? HOVER_STROKE : STROKE}
                  strokeDasharray={`${dashLength} ${CIRCUMFERENCE - dashLength}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap={visible.length > 1 ? "round" : "butt"}
                  transform={`rotate(-90 ${CENTER} ${CENTER})`}
                  tabIndex={0}
                  role="img"
                  aria-label={`${segment.label}: ${segment.count} of ${total} (${percent}%)`}
                  className="cursor-pointer outline-none transition-[stroke-width] focus-visible:opacity-80"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                    showTooltip(segment, e.clientX - rect.left, e.clientY - rect.top);
                  }}
                  onFocus={() => showTooltip(segment, labelPoint.x, labelPoint.y)}
                  onBlur={() => setTooltip(null)}
                />
                {showDirectLabels && percent >= MIN_LABEL_PERCENT && (
                  <text
                    x={labelPoint.x}
                    y={labelPoint.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none fill-current text-[13px] font-semibold"
                  >
                    {percent}%
                  </text>
                )}
              </g>
            );
          })}
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2.5 py-1.5 text-popover-foreground shadow-md"
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
          <p className="text-sm font-bold leading-tight">{tooltip.percent}%</p>
          <p className="text-xs leading-tight text-muted-foreground">
            {tooltip.label} · {tooltip.count} of {total}
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold leading-none">{centerValue}</span>
        <span className="mt-1 text-xs text-muted-foreground">{centerLabel}</span>
      </div>
    </div>
  );
}
