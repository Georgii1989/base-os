"use client";

import { useId, useMemo, useState } from "react";
import {
  buildChartYearBands,
  chartYDomain,
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

const PLOT = { left: 58, right: 16, top: 18, bottom: 52 };
const WIDTH = 640;
const HEIGHT = 296;

/** Monotone polyline — no Bézier overshoot above/below data. */
function buildLinePath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return "";
  return coords
    .map((point, index) =>
      index === 0
        ? `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
        : `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
    )
    .join(" ");
}

function nearestIndexFromPlotX(coords: { x: number; index: number }[], plotX: number): number {
  let nearest = 0;
  let best = Infinity;
  for (const c of coords) {
    const dist = Math.abs(c.x - plotX);
    if (dist < best) {
      best = dist;
      nearest = c.index;
    }
  }
  return nearest;
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
  const clipId = `chart-clip-${uid}`;

  const layout = useMemo(() => {
    if (points.length < 2) return null;

    const values = points.map((p) => p.value);
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const { yTicks, yMin, yMax } = chartYDomain(dataMin, dataMax, 5);
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
    const yearBands = buildChartYearBands(points.map((p) => p.date), (i) => coords[i]!.x);

    return { yTicks, yMin, yMax, plotW, plotH, coords, xIndices, yearBands, dataMin, dataMax };
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

  const { yTicks, coords, xIndices, yearBands, plotH, plotW } = layout;
  const plotBottom = PLOT.top + plotH;
  const linePath = buildLinePath(coords);
  const areaPath = `${linePath} L ${coords[coords.length - 1]!.x.toFixed(2)} ${plotBottom} L ${coords[0]!.x.toFixed(2)} ${plotBottom} Z`;

  const active =
    hoverIndex != null && coords[hoverIndex] ? coords[hoverIndex]! : coords[coords.length - 1]!;

  function setHoverFromSvg(svg: SVGSVGElement, clientX: number) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = 0;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const local = pt.matrixTransform(ctm.inverse());
    setHoverIndex(nearestIndexFromPlotX(coords, local.x));
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 rounded-xl border border-white/8 bg-black/25 px-3 py-2 text-xs">
        <div>
          <p className="text-slate-500">Selected</p>
          <p className="text-sm font-bold text-white">
            {formatChartDate(active.point.date, { withYear: true })}
          </p>
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
        preserveAspectRatio="xMidYMid meet"
        className="block h-56 w-full max-w-full min-h-[220px] md:h-72 lg:h-80"
        role="img"
        aria-label="Historical chart"
        onMouseLeave={() => setHoverIndex(null)}
        onMouseMove={(e) => setHoverFromSvg(e.currentTarget, e.clientX)}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          if (touch) setHoverFromSvg(e.currentTarget, touch.clientX);
        }}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (touch) setHoverFromSvg(e.currentTarget, touch.clientX);
        }}
      >
        <defs>
          <clipPath id={clipId}>
            <rect
              x={PLOT.left}
              y={PLOT.top}
              width={plotW}
              height={plotH}
              rx="2"
            />
          </clipPath>
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
          y1={plotBottom}
          x2={WIDTH - PLOT.right}
          y2={plotBottom}
          stroke="rgba(255,255,255,0.2)"
        />
        <line
          x1={PLOT.left}
          y1={PLOT.top}
          x2={PLOT.left}
          y2={plotBottom}
          stroke="rgba(255,255,255,0.2)"
        />

        <g clipPath={`url(#${clipId})`}>
          <path d={areaPath} fill={`url(#${fillId})`} />
          <path
            d={linePath}
            fill="none"
            stroke={stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {hoverIndex != null ? (
          <g clipPath={`url(#${clipId})`}>
            <line
              x1={active.x}
              y1={PLOT.top}
              x2={active.x}
              y2={plotBottom}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r="5"
              fill={stroke}
              stroke="#0f172a"
              strokeWidth="2"
            />
          </g>
        ) : null}

        {yearBands.map((band) => (
          <g key={band.year}>
            {band.startX > PLOT.left + 4 ? (
              <line
                x1={band.startX}
                y1={plotBottom + 4}
                x2={band.startX}
                y2={HEIGHT - 22}
                stroke="rgba(255,255,255,0.1)"
              />
            ) : null}
            <text
              x={band.midX}
              y={HEIGHT - 4}
              textAnchor="middle"
              fill="rgba(100,116,139,0.95)"
              fontSize="10"
              fontWeight="600"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {band.year}
            </text>
          </g>
        ))}

        {xIndices.map((idx) => {
          const c = coords[idx]!;
          return (
            <text
              key={idx}
              x={c.x}
              y={HEIGHT - 22}
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
