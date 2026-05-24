/** When max/min exceeds this, bar widths use log10 scale so small values stay distinguishable. */
const LOG_SCALE_RATIO_THRESHOLD = 50;

/** Smallest visible bar (%), only so non-zero values remain clickable. */
const MIN_VISIBLE_PCT = 0.35;

/**
 * Map a value to a 0–100 bar width. Uses log scale when the dataset spans orders of magnitude.
 */
export function barWidthPct(value: number, values: number[]): number {
  if (value <= 0) return 0;

  const positives = values.filter((v) => v > 0);
  if (positives.length === 0) return 0;

  const max = Math.max(...positives);
  if (value >= max) return 100;

  const min = Math.min(...positives);
  const ratio = max / min;

  if (ratio <= LOG_SCALE_RATIO_THRESHOLD) {
    return Math.max(MIN_VISIBLE_PCT, (value / max) * 100);
  }

  const logMax = Math.log10(max);
  const logMin = Math.log10(min);
  const logVal = Math.log10(value);
  const span = logMax - logMin;
  if (span <= 0) return MIN_VISIBLE_PCT;

  const pct = ((logVal - logMin) / span) * 100;
  return Math.max(MIN_VISIBLE_PCT, Math.min(100, pct));
}
