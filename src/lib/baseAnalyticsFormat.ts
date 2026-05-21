/** Compact USD / percent formatters for Base analytics panels. */
export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  if (abs >= 1) return `$${value.toFixed(2)}`;
  return `$${value.toPrecision(3)}`;
}

export function formatPct(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(
    value
  );
}

/** Downsample TVL history for charts (keeps first + last + evenly spaced middle). */
export function downsampleTvlSeries<T extends { date: number; tvl: number }>(
  points: T[],
  maxPoints = 90
): T[] {
  if (points.length <= maxPoints) return points;
  const out: T[] = [];
  const step = (points.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i += 1) {
    out.push(points[Math.round(i * step)]!);
  }
  return out;
}

export function tvlChangePct(series: { tvl: number }[]): number | null {
  if (series.length < 2) return null;
  const first = series[0]!.tvl;
  const last = series[series.length - 1]!.tvl;
  if (!first || !last) return null;
  return ((last - first) / first) * 100;
}
