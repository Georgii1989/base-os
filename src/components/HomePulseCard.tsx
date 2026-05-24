"use client";

import type { CSSProperties } from "react";
import type { MetricCardModel } from "@/lib/analyticsMetricCards";
import {
  pulseAccent,
  pulseAccentStyles,
  pulseVisualForCard,
  type PulseAccent,
} from "@/lib/homePulseVisuals";
import type { BaseAnalyticsPayload } from "@/lib/baseAnalyticsTypes";

function PulseIcon({ label, accent }: { label: string; accent: PulseAccent }) {
  const cls = pulseAccentStyles(accent).icon;
  const common = `h-5 w-5 ${cls}`;

  if (label.startsWith("DEX")) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden>
        <path
          d="M4 18V6l6 4 6-4v12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M10 10v8M14 6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (label.startsWith("TVL ·")) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden>
        <path
          d="M4 16l4-5 4 3 5-7 3 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (label === "Stablecoins") {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
        <path d="M12 8v8M9 10h6M9 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (label.startsWith("Fees")) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden>
        <rect x="4" y="12" width="4" height="8" rx="1" fill="currentColor" opacity="0.5" />
        <rect x="10" y="8" width="4" height="12" rx="1" fill="currentColor" opacity="0.75" />
        <rect x="16" y="4" width="4" height="16" rx="1" fill="currentColor" />
      </svg>
    );
  }
  if (label.includes("Transactions") || label.includes("Tx")) {
    return (
      <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden>
        <path
          d="M5 12h14M13 6l6 6-6 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={common} fill="none" aria-hidden>
      <path d="M4 18V8l4-3 4 3 4-3 4 3v10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SparklineChart({
  values,
  positive,
  accent,
}: {
  values: number[];
  positive: boolean;
  accent: PulseAccent;
}) {
  const styles = pulseAccentStyles(accent);
  const stroke = positive ? styles.stroke : "#fb7185";
  const fill = positive ? styles.fill : "rgba(251,113,133,0.15)";

  if (values.length < 2) {
    return (
      <div className="flex h-12 items-end gap-1 px-1">
        {[0.35, 0.55, 0.45, 0.7, 0.5, 0.65].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-white/10"
            style={{ height: `${h * 100}%` }}
          />
        ))}
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const h = 40;
  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * 100,
    y: h - 4 - ((value - min) / range) * (h - 8),
  }));
  const linePath = points.reduce((d, point, index) => {
    if (index === 0) return `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
    const prev = points[index - 1];
    const cx = prev.x + (point.x - prev.x) / 2;
    return `${d} C ${cx.toFixed(2)} ${prev.y.toFixed(2)}, ${cx.toFixed(2)} ${point.y.toFixed(2)}, ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }, "");
  const areaPath = `${linePath} L 100 ${h} L 0 ${h} Z`;

  return (
    <svg viewBox={`0 0 100 ${h}`} className="h-12 w-full overflow-visible" preserveAspectRatio="none">
      <path d={areaPath} fill={fill} />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function MiniBars({
  items,
  accent,
}: {
  items: { label: string; value: number }[];
  accent: PulseAccent;
}) {
  const styles = pulseAccentStyles(accent);
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="flex h-12 items-end gap-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-md"
            style={{
              height: `${Math.max(12, (item.value / max) * 44)}px`,
              background: `linear-gradient(to top, ${styles.fill}, ${styles.stroke})`,
            }}
            title={`${item.label}: ${item.value}`}
          />
          <span className="max-w-full truncate text-[8px] font-bold uppercase text-slate-500">
            {item.label.slice(0, 4)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function HomePulseCard({
  card,
  analytics,
  onClick,
  style,
}: {
  card: MetricCardModel;
  analytics: BaseAnalyticsPayload;
  onClick: () => void;
  style?: CSSProperties;
}) {
  const accent = pulseAccent(card);
  const styles = pulseAccentStyles(accent);
  const visual = pulseVisualForCard(analytics, card);
  const valueColor =
    accent === "emerald"
      ? "text-emerald-200"
      : accent === "amber"
        ? "text-amber-200"
        : accent === "fuchsia"
          ? "text-fuchsia-200"
          : "text-cyan-200";

  return (
    <button
      type="button"
      onClick={onClick}
      className="os-animate-fade-up group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-black/50 to-slate-950/80 p-4 text-left transition hover:border-cyan-300/40 hover:shadow-[0_0_24px_rgba(34,211,238,0.12)]"
      style={style}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${styles.glow} opacity-80`}
        aria-hidden
      />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/40">
            <PulseIcon label={card.label} accent={accent} />
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
            {card.label}
          </p>
        </div>

        <div className="mt-3 rounded-xl border border-white/5 bg-black/30 px-2 py-1.5">
          {visual.kind === "sparkline" ? (
            <SparklineChart values={visual.values} positive={visual.positive} accent={accent} />
          ) : (
            <MiniBars items={visual.items} accent={accent} />
          )}
        </div>

        <p className={`mt-3 text-xl font-black ${valueColor}`}>{card.value}</p>
        {card.hint ? <p className="mt-1 text-xs text-slate-500">{card.hint}</p> : null}
      </div>
    </button>
  );
}
