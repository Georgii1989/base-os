import type { MetricCardModel } from "@/lib/analyticsMetricCards";
import type { BaseAnalyticsPayload } from "@/lib/baseAnalyticsTypes";

export type PulseAccent = "cyan" | "emerald" | "amber" | "fuchsia";

export type PulseBarItem = { label: string; value: number };

export type PulseVisual =
  | { kind: "sparkline"; values: number[]; positive: boolean }
  | { kind: "bars"; items: PulseBarItem[]; positive: boolean };

const ACCENT_STYLES: Record<
  PulseAccent,
  { icon: string; glow: string; stroke: string; fill: string }
> = {
  cyan: {
    icon: "text-cyan-300",
    glow: "from-cyan-500/20 to-cyan-500/5",
    stroke: "#22d3ee",
    fill: "rgba(34,211,238,0.18)",
  },
  emerald: {
    icon: "text-emerald-300",
    glow: "from-emerald-500/20 to-emerald-500/5",
    stroke: "#34d399",
    fill: "rgba(52,211,153,0.18)",
  },
  amber: {
    icon: "text-amber-300",
    glow: "from-amber-500/20 to-amber-500/5",
    stroke: "#fbbf24",
    fill: "rgba(251,191,36,0.18)",
  },
  fuchsia: {
    icon: "text-fuchsia-300",
    glow: "from-fuchsia-500/20 to-fuchsia-500/5",
    stroke: "#e879f9",
    fill: "rgba(232,121,249,0.18)",
  },
};

export function pulseAccent(card: MetricCardModel): PulseAccent {
  return card.accent ?? "cyan";
}

export function pulseAccentStyles(accent: PulseAccent) {
  return ACCENT_STYLES[accent];
}

function lastSeries(values: number[], count: number): number[] {
  if (values.length <= count) return values;
  return values.slice(-count);
}

export function pulseVisualForCard(
  data: BaseAnalyticsPayload,
  card: MetricCardModel
): PulseVisual {
  const label = card.label;

  if (label === "Total TVL" || label === "DeFi TVL (ref)") {
    const values = lastSeries(
      data.tvlHistory.map((p) => p.tvl).filter((v) => v > 0),
      21
    );
    return {
      kind: "sparkline",
      values,
      positive: (data.tvlChange30dPct ?? 0) >= 0,
    };
  }

  if (label.startsWith("DEX volume")) {
    const dex = data.dexVolume;
    if (dex?.byProtocol.length) {
      const items = [...dex.byProtocol]
        .sort((a, b) => b.volume24h - a.volume24h)
        .slice(0, 4)
        .map((p) => ({ label: p.name, value: p.volume24h }));
      return {
        kind: "bars",
        items,
        positive: (dex.change1dPct ?? 0) >= 0,
      };
    }
    if (dex) {
      return {
        kind: "sparkline",
        values: [dex.total30d / 30, dex.total7d / 7, dex.total24h].filter((v) => v > 0),
        positive: (dex.change1dPct ?? 0) >= 0,
      };
    }
  }

  if (label.startsWith("TVL ·")) {
    const values = lastSeries(
      data.tvlHistory.map((p) => p.tvl).filter((v) => v > 0),
      14
    );
    return {
      kind: "sparkline",
      values,
      positive: (data.tvlChange30dPct ?? 0) >= 0,
    };
  }

  if (label === "Stablecoins") {
    const breakdown = data.stablecoins?.breakdown ?? [];
    if (breakdown.length > 0) {
      return {
        kind: "bars",
        items: breakdown.slice(0, 4).map((b) => ({ label: b.label, value: b.usd })),
        positive: true,
      };
    }
  }

  if (label.startsWith("Fees")) {
    const fees = data.fees;
    if (fees) {
      return {
        kind: "sparkline",
        values: [fees.total30d / 30, fees.total7d / 7, fees.total24h].filter((v) => v > 0),
        positive: (fees.change1dPct ?? 0) >= 0,
      };
    }
  }

  if (data.activity?.history.length) {
    return {
      kind: "sparkline",
      values: lastSeries(
        data.activity.history.map((p) => p.transactions),
        21
      ),
      positive: (data.activity.change7dPct ?? 0) >= 0,
    };
  }

  const fallback = lastSeries(
    data.tvlHistory.map((p) => p.tvl).filter((v) => v > 0),
    14
  );
  return { kind: "sparkline", values: fallback, positive: true };
}
