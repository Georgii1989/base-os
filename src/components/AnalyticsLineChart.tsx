"use client";

import { useId, useMemo, useState } from "react";
import {
  buildYAxisTicks,
  formatChartDate,
  pickXAxisIndices,
} from "@/lib/analyticsChartScale";
import { formatCompactNumber, formatUsd } from "@/lib/baseAnalyticsFormat";

export type ChartPoint = { date: number; value: number };

type Props = {
  points: ChartPoint[];
  positive?: boolean;
  formatValue?: (value: number) => string;
  accent?: "cyan" | "emerald" | "fuchsia";
  className?: string;
};

const PLOT = { left: 58, right: 16, top: 18, bottom: 36 };
const WIDTH = 640;
const HEIGHT = 280;

function buildSmoothPath(
  coords: { x: number; y: number }[]
): string {
  if (coords.length === 0) return "";
  return coords.reduce((d, point, index) => {
    if (index === 0) return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    const prev = coords[index - 1]!;
    const controlX1 = prev.x + (point.x - prev.x) / 2;
    const controlX2 = point.x - (point.x - prev.x) / 2;
    return `${d} C ${controlX1.toFixed(2)} ${prev.y.toFixed(2)}, ${controlX2.toFixed(2)} ${point.y.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }, "");
}

export function AnalyticsLineChart({
  points,
  positive = true,
  formatValue = formatUsd,
  accent = "cyan",
  className = "",
}: Props) {
  const uid = useId().replace(/:/g, "");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const stroke =
    accent === "emerald" ? "#34d399" : accent === "fuchsia" ? "#e879f9" : "#22d3ee";
  const fillId = `chart-fill-${uid}`;

  const layout = useMemo(() => {
    if (points.length < 2) return null;

    const values = points.map((p) => p.value);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const yTicks = buildYAxisTicks(dataMin, dataMax, 5);
    const yMin = yTicks[0] ?? dataMin;
    const yMax = yTicks[yTicks.length - 1] ?? dataMax;
    const yRange = yMax - yMin || 1;

    const plotW = WIDTH - PLOT.left - PLOT.right;
    const plotH = HEIGHT - PLOT.top - PLOT.bottom;

    const coords = points.map((p, i) => ({
      x: PLOT.left + (i / (points.length - 1)) * plotW,
      y: PLOT.top + plotH - ((p.value - yMin) / yRange) * plotH,
      point: p,
      index: i,
    }));

    const xIndices = pickXAxisIndices(points.length, 6);

    return { yTicks, yMin, yMax, plotW, plotH, coords, xIndices, dataMin, dataMax };
  }, [points]);

  if (!layout) {
    return (
      <div
        className={`flex h-52 items-center justify-center rounded-2xl border border-white/8 bg-black/30 text-sm text-slate-500 ${className}`}
      >
        Not enough data for chart
      </div>
    );
  }

  const { yTicks, coords, xIndices, plotH } = layout;
  const linePath = buildSmoothPath(coords);
  const areaPath = `${linePath} L ${coords[coords.length - 1]!.x.toFixed(2)} ${PLOT.top + plotH} L ${coords[0]!.x.toFixed(2)} ${PLOT.top + plotH} Z`;

  const active =
    hoverIndex != null && coords[hoverIndex] ? coords[hoverIndex]! : coords[coords.length - 1]!;

  function handlePointer(clientX: number, rect: DOMRect) {
    const x = ((clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let best = Infinity;
    for (const c of coords) {
      const dist = Math.abs(c.x - x);
      if (dist < best) {
        best = dist;
        nearest = c.index;
      }
    }
    setHoverIndex(nearest);
  }

  return (
    <div className={`relative ${className}`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 rounded-xl border border-white/8 bg-black/25 px-3 py-2 text-xs">
        <div>
          <p className="text-slate-500">Selected</p>
          <p className="text-sm font-bold text-white">{formatChartDate(active.point.date)}</p>
        </div>
        <div className="text-right">
          <p className="text-slate-500">Value</p>
          <p className="text-sm font-black" style={{ color: stroke }}>
            {formatValue(active.point.value)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-slate-500">Range</p>
          <p className="text-sm font-semibold text-slate-300">
            {formatValue(layout.dataMin)} → {formatValue(layout.dataMax)}
          </p>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-56 w-full min-h-[220px] md:h-72 lg:h-80"
        role="img"
        aria-label="Historical chart"
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(e) => handlePointer(e.clientX, e.currentTarget.getBoundingClientRect())}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (touch) handlePointer(touch.clientX, e.currentTarget.getBoundingClientRect());
        }}
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={positive ? 0.45 : 0.3} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => {
          const y =
            PLOT.top +
            plotH -
            ((tick - layout.yMin) / (layout.yMax - layout.yMin || 1)) * plotH;
          return (
            <g key={tick}>
              <line
                x1={PLOT.left}
                y1={y}
                x2={WIDTH - PLOT.right}
                y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="4 6"
              />
              <text
                x={PLOT.left - 8}
                y={y + 4}
                textAnchor="end"
                fill="rgba(148,163,184,0.95)"
                fontSize="11"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {tick >= 1_000_000 ? formatCompactNumber(tick) : formatValue(tick)}
              </text>
            </g>
          );
        })}

        <line
          x1={PLOT.left}
          y1={PLOT.top + plotH}
          x2={WIDTH - PLOT.right}
          y2={PLOT.top + plotH}
          stroke="rgba(255,255,255,0.2)"
        />
        <line
          x1={PLOT.left}
          y1={PLOT.top}
          x2={PLOT.left}
          y2={PLOT.top + plotH}
          stroke="rgba(255,255,255,0.2)"
        />

        <path d={areaPath} fill={`url(#${fillId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hoverIndex != null ? (
          <>
            <line
              x1={active.x}
              y1={PLOT.top}
              x2={active.x}
              y2={PLOT.top + plotH}
              stroke="rgba(255,255,255,0.25)"
              strokeDasharray="3 4"
            />
            <circle cx={active.x} cy={active.y} r="5" fill={stroke} stroke="#0f172a" strokeWidth="2" />
          </>
        ) : null}

        {xIndices.map((idx) => {
          const c = coords[idx]!;
          return (
            <text
              key={idx}
              x={c.x}
              y={HEIGHT - 10}
              textAnchor="middle"
              fill="rgba(148,163,184,0.95)"
              fontSize="11"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {formatChartDate(c.point.date)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
