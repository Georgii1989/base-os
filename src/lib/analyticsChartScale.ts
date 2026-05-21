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
    if (ticks.length > targetCount + 2) break;
  }

  if (ticks[ticks.length - 1]! < max) ticks.push(tickMin + step * (ticks.length - 1));
  return ticks;
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

export function formatChartDate(date: number): string {
  return new Date(toChartTimestamp(date)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
