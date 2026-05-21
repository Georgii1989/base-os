/** Nice Y-axis tick values between min and max. */
export function buildYAxisTicks(min: number, max: number, targetCount = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.1;
    return [min - pad, min, min + pad];
  }

  const range = max - min;
  const roughStep = range / Math.max(targetCount - 1, 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const step = Math.max(magnitude, Math.ceil(roughStep / magnitude) * magnitude);

  const tickMin = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = tickMin; v <= max + step * 0.01; v += step) {
    ticks.push(v);
    if (ticks.length > targetCount + 4) break;
  }

  let top = ticks[ticks.length - 1] ?? max;
  while (top < max) {
    top += step;
    ticks.push(top);
  }

  return ticks;
}

/** Y domain for chart plot: ticks always cover [dataMin, dataMax] with headroom. */
export function chartYDomain(
  dataMin: number,
  dataMax: number,
  targetCount = 5
): { yMin: number; yMax: number; yTicks: number[] } {
  const span = dataMax - dataMin || Math.max(Math.abs(dataMax), 1);
  const pad = span * 0.06;
  const floor = dataMin >= 0 && dataMin <= span * 0.05 ? 0 : dataMin - pad;
  const ceil = dataMax + pad;
  const yTicks = buildYAxisTicks(floor, ceil, targetCount);
  const yMin = yTicks[0] ?? floor;
  const yMax = yTicks[yTicks.length - 1] ?? ceil;
  return { yMin, yMax, yTicks };
}

export function pickXAxisIndices(length: number, count = 5): number[] {
  if (length <= 1) return [0];
  if (length <= count) return Array.from({ length }, (_, i) => i);
  const indices = new Set<number>();
  for (let i = 0; i < count; i += 1) {
    indices.add(Math.round((i / (count - 1)) * (length - 1)));
  }
  return Array.from(indices).sort((a, b) => a - b);
}

export function toChartTimestamp(date: number): number {
  return date > 1e12 ? date : date * 1000;
}

export function formatChartDate(date: number, opts?: { withYear?: boolean }): string {
  return new Date(toChartTimestamp(date)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(opts?.withYear ? { year: "numeric" } : {}),
  });
}

export function formatChartYear(date: number): string {
  return String(new Date(toChartTimestamp(date)).getFullYear());
}

export type ChartYearBand = {
  year: number;
  startX: number;
  endX: number;
  midX: number;
};

/** One band per calendar year along the X axis (for a year row under month labels). */
export function buildChartYearBands(
  dates: number[],
  xAtIndex: (index: number) => number
): ChartYearBand[] {
  if (dates.length === 0) return [];

  const bands: ChartYearBand[] = [];
  let year = new Date(toChartTimestamp(dates[0]!)).getFullYear();
  let startX = xAtIndex(0);
  let endX = startX;

  for (let i = 1; i < dates.length; i += 1) {
    const nextYear = new Date(toChartTimestamp(dates[i]!)).getFullYear();
    const x = xAtIndex(i);
    if (nextYear !== year) {
      bands.push({ year, startX, endX, midX: (startX + endX) / 2 });
      year = nextYear;
      startX = x;
      endX = x;
    } else {
      endX = x;
    }
  }

  bands.push({ year, startX, endX, midX: (startX + endX) / 2 });
  return bands;
}
