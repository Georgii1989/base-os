import { formatCompactNumber } from "@/lib/baseAnalyticsFormat";
import type { OnchainScoreMetrics } from "@/lib/onchainScoreCompute";

export type ScoreBreakdownItem = {
  id: string;
  label: string;
  description: string;
  rawValue: string;
  points: number;
  /** Max typical contribution (for bar width), not a hard cap on points. */
  barMax: number;
};

type RawComponents = {
  outgoing: number;
  contracts: number;
  addresses: number;
  bridges: number;
  deployments: number;
  activeDays: number;
  tokens: number;
};

export function rawScoreComponents(
  metrics: OnchainScoreMetrics,
  tokenTransfers: number | null
): RawComponents {
  return {
    outgoing: Math.log10(metrics.outgoingTxs + 1) * 18,
    contracts: Math.log10(metrics.uniqueContractsTouched + 1) * 12,
    addresses: Math.log10(metrics.uniqueAddressesTouched + 1) * 6,
    bridges: metrics.bridgeTxs * 4,
    deployments: metrics.deployments * 8,
    activeDays: Math.min(metrics.activeDays, 90) * 0.35,
    tokens: tokenTransfers != null ? Math.log10(tokenTransfers + 1) * 5 : 0,
  };
}

export function computeScoreFromComponents(components: RawComponents): number {
  const sum =
    components.outgoing +
    components.contracts +
    components.addresses +
    components.bridges +
    components.deployments +
    components.activeDays +
    components.tokens;
  return Math.min(100, Math.round(sum));
}

export function buildScoreBreakdown(
  metrics: OnchainScoreMetrics,
  tokenTransfers: number | null,
  options?: { rpcTxCount?: number }
): { items: ScoreBreakdownItem[]; total: number } {
  if (metrics.txsAnalyzed === 0 && (options?.rpcTxCount ?? 0) > 0) {
    const nonce = options!.rpcTxCount!;
    const points = Math.min(100, Math.round(Math.log10(nonce + 1) * 22));
    return {
      total: points,
      items: [
        {
          id: "nonce",
          label: "RPC activity estimate",
          description: "Full tx index unavailable — score from on-chain nonce only.",
          rawValue: `${formatCompactNumber(nonce)} outgoing nonce`,
          points,
          barMax: 100,
        },
      ],
    };
  }

  const raw = rawScoreComponents(metrics, tokenTransfers);
  const items: ScoreBreakdownItem[] = [
    {
      id: "outgoing",
      label: "Transaction depth",
      description: "More outgoing activity on Base raises this (log scale).",
      rawValue: `${formatCompactNumber(metrics.outgoingTxs)} outgoing txs`,
      points: Math.round(raw.outgoing),
      barMax: 36,
    },
    {
      id: "contracts",
      label: "Contract exploration",
      description: "Unique contracts you called with calldata.",
      rawValue: `${formatCompactNumber(metrics.uniqueContractsTouched)} contracts · ${formatCompactNumber(metrics.contractCalls)} calls`,
      points: Math.round(raw.contracts),
      barMax: 24,
    },
    {
      id: "addresses",
      label: "Counterparties",
      description: "Distinct addresses you sent to or received from.",
      rawValue: `${formatCompactNumber(metrics.uniqueAddressesTouched)} unique`,
      points: Math.round(raw.addresses),
      barMax: 12,
    },
    {
      id: "bridges",
      label: "Bridge usage",
      description: "Outgoing txs to known Base bridge contracts.",
      rawValue: `${formatCompactNumber(metrics.bridgeTxs)} bridge-like`,
      points: Math.round(raw.bridges),
      barMax: 20,
    },
    {
      id: "deployments",
      label: "Deployments",
      description: "Contract creations you initiated.",
      rawValue: `${formatCompactNumber(metrics.deployments)} deploys`,
      points: Math.round(raw.deployments),
      barMax: 16,
    },
    {
      id: "activeDays",
      label: "Active days",
      description: "Days with at least one indexed in/out tx (capped at 90 days).",
      rawValue: `${formatCompactNumber(metrics.activeDays)} days`,
      points: Math.round(raw.activeDays),
      barMax: 32,
    },
  ];

  if (tokenTransfers != null) {
    items.push({
      id: "tokens",
      label: "Token transfers",
      description: "ERC-20 movements in the indexed sample.",
      rawValue: `${formatCompactNumber(tokenTransfers)} transfers`,
      points: Math.round(raw.tokens),
      barMax: 15,
    });
  }

  const sorted = items.filter((i) => i.points > 0).sort((a, b) => b.points - a.points);
  const total = computeScoreFromComponents(raw);

  return { items: sorted.length > 0 ? sorted : items.slice(0, 4), total };
}
