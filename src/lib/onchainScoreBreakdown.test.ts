import { describe, expect, it } from "vitest";
import { buildScoreBreakdown } from "@/lib/onchainScoreBreakdown";
import type { OnchainScoreMetrics } from "@/lib/onchainScoreCompute";

const baseMetrics: OnchainScoreMetrics = {
  outgoingTxs: 398,
  incomingTxs: 12,
  totalTxsSeen: 500,
  contractCalls: 360,
  simpleTransfers: 30,
  uniqueContractsTouched: 134,
  uniqueAddressesTouched: 147,
  bridgeTxs: 8,
  deployments: 17,
  failedTxs: 11,
  activeDays: 149,
  firstActivityAt: 1_700_000_000_000,
  lastActivityAt: 1_750_000_000_000,
  tokenTransfers: 267,
  txsAnalyzed: 410,
  capped: false,
};

describe("buildScoreBreakdown", () => {
  it("breakdown total matches score formula", () => {
    const { total, items } = buildScoreBreakdown(baseMetrics, 267);
    expect(total).toBeGreaterThan(50);
    expect(items.length).toBeGreaterThan(3);
    expect(items.reduce((s, i) => s + i.points, 0)).toBeGreaterThanOrEqual(total - 2);
  });

  it("uses nonce fallback when no indexed txs", () => {
    const empty = { ...baseMetrics, outgoingTxs: 0, txsAnalyzed: 0 };
    const { items, total } = buildScoreBreakdown(empty, null, { rpcTxCount: 100 });
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("nonce");
    expect(total).toBeGreaterThan(0);
  });
});
