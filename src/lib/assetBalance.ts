import { formatUnits } from "viem";
import { formatSwapBalance } from "@/lib/swapTokens";

export function formatAssetBalance(
  value: bigint,
  decimals: number,
  symbol: string
): string {
  return formatSwapBalance(formatUnits(value, decimals), symbol);
}

/** Leave a small native gas buffer when filling max amount. */
export function maxSpendAmount(
  value: bigint,
  decimals: number,
  isNative: boolean
): string {
  const raw = formatUnits(value, decimals);
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return "0";

  if (isNative) {
    const buffer = decimals <= 6 ? 0.01 : 0.0005;
    const max = n > buffer * 2 ? Math.max(0, n - buffer) : n;
    return trimAmountInput(max, decimals);
  }

  return trimAmountInput(n, decimals);
}

function trimAmountInput(n: number, decimals: number): string {
  const precision = Math.min(8, Math.max(4, decimals));
  if (n < 0.0001) return n.toFixed(Math.min(precision, 8));
  if (n < 1) return n.toFixed(Math.min(6, precision));
  return n.toFixed(Math.min(4, precision));
}
