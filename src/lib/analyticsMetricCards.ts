import { formatCompactNumber, formatPct, formatUsd } from "@/lib/baseAnalyticsFormat";
import type { BaseAnalyticsPayload } from "@/lib/baseAnalyticsTypes";

export type MetricCardModel = {
  label: string;
  value: string;
  hint?: string;
  accent?: "cyan" | "emerald" | "amber" | "fuchsia";
};

export function buildMetricCards(data: BaseAnalyticsPayload): MetricCardModel[] {
  switch (data.source) {
    case "l2beat":
      return [
        {
          label: "Transactions · day",
          value: formatCompactNumber(data.activity?.transactionsLatest),
          hint: "Latest day on Base (L2BEAT)",
          accent: "cyan",
        },
        {
          label: "UOPS · day",
          value: formatCompactNumber(data.activity?.uopsLatest),
          hint: "User operations count",
          accent: "fuchsia",
        },
        {
          label: "Tx · 7d avg",
          value: formatCompactNumber(data.activity?.avgTransactions7d),
          hint: "Rolling 7-day average",
          accent: "emerald",
        },
        {
          label: "Tx · 7d change",
          value: formatPct(data.activity?.change7dPct),
          hint: "vs 7 days ago",
          accent: (data.activity?.change7dPct ?? 0) >= 0 ? "emerald" : "fuchsia",
        },
        {
          label: "DeFi TVL (ref)",
          value: formatUsd(data.chain.tvlUsd),
          hint: "Cross-check from DeFi Llama chains API",
          accent: "amber",
        },
      ];
    case "blockscout":
      return [
        {
          label: "Transactions · today",
          value: formatCompactNumber(data.onchain?.transactionsToday),
          hint: "Base mainnet (Blockscout)",
          accent: "cyan",
        },
        {
          label: "Total transactions",
          value: formatCompactNumber(data.onchain?.totalTransactions),
          hint: "All-time indexed txs",
          accent: "emerald",
        },
        {
          label: "Addresses",
          value: formatCompactNumber(data.onchain?.totalAddresses),
          hint: "Unique addresses seen",
          accent: "amber",
        },
        {
          label: "Gas · average",
          value: data.onchain ? `${data.onchain.gasGwei.average.toFixed(3)} gwei` : "—",
          hint: `Slow ${data.onchain?.gasGwei.slow.toFixed(3) ?? "—"} · Fast ${data.onchain?.gasGwei.fast.toFixed(3) ?? "—"}`,
          accent: "fuchsia",
        },
        {
          label: "Network load",
          value:
            data.onchain?.networkUtilizationPct != null
              ? `${data.onchain.networkUtilizationPct.toFixed(1)}%`
              : "—",
          hint: data.onchain?.ethPriceUsd
            ? `ETH $${data.onchain.ethPriceUsd.toFixed(0)} (${formatPct(data.onchain.ethPriceChange24hPct)} 24h)`
            : "Utilization",
          accent: "emerald",
        },
      ];
    case "defillama":
    default:
      return [
        {
          label: "Total TVL",
          value: formatUsd(data.chain.tvlUsd),
          hint:
            data.chain.rank != null && data.chain.totalChains != null
              ? `#${data.chain.rank} of ${data.chain.totalChains} chains`
              : "Base mainnet",
        },
        {
          label: "DEX volume · 24h",
          value: formatUsd(data.dexVolume?.total24h),
          hint: data.dexVolume
            ? data.dexVolume.source === "overview"
              ? "Chain total (DeFi Llama)"
              : `Sum of ${data.dexVolume.byProtocol.length} DEXes on Base`
            : "DEX volume loading slowly",
          accent: (data.dexVolume?.change1dPct ?? 0) >= 0 ? "fuchsia" : "amber",
        },
        {
          label: "TVL · 30d",
          value: formatPct(data.tvlChange30dPct),
          hint: "From DeFi Llama history",
          accent: (data.tvlChange30dPct ?? 0) >= 0 ? "emerald" : "fuchsia",
        },
        {
          label: "Stablecoins",
          value: formatUsd(data.stablecoins?.circulatingUsd),
          hint: "Circulating on Base",
          accent: "amber",
        },
        {
          label: "Fees · 24h",
          value: formatUsd(data.fees?.total24h),
          hint:
            data.fees?.change1dPct != null
              ? `${formatPct(data.fees.change1dPct)} vs prior day`
              : "Protocol fees on Base",
          accent: "emerald",
        },
      ];
  }
}
