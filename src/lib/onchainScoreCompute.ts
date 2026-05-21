import { isLikelyBridgeTarget } from "@/lib/baseBridgeContracts";
import type { BasescanNormalTx } from "@/lib/basescanAccountTx";
import { normalizeHexAddrField } from "@/lib/basescanAccountTx";

export type OnchainScoreMetrics = {
  outgoingTxs: number;
  incomingTxs: number;
  totalTxsSeen: number;
  contractCalls: number;
  simpleTransfers: number;
  uniqueContractsTouched: number;
  uniqueAddressesTouched: number;
  bridgeTxs: number;
  deployments: number;
  failedTxs: number;
  activeDays: number;
  firstActivityAt: number | null;
  lastActivityAt: number | null;
  tokenTransfers: number | null;
  txsAnalyzed: number;
  capped: boolean;
};

export type OnchainScoreResult = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "—";
  metrics: OnchainScoreMetrics;
};

function isContractCreationRow(tx: BasescanNormalTx): boolean {
  const to = (tx.to ?? "").trim();
  return to === "" || to === "0x";
}

function txTimestamp(tx: BasescanNormalTx): number | null {
  const raw = tx.timeStamp ?? (tx as { timestamp?: string }).timestamp;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n * 1000 : null;
}

function isFailedTx(tx: BasescanNormalTx): boolean {
  const err = (tx as { isError?: string; txreceipt_status?: string }).isError;
  const receipt = (tx as { txreceipt_status?: string }).txreceipt_status;
  if (err === "1") return true;
  if (receipt === "0") return true;
  return false;
}

function hasContractInput(tx: BasescanNormalTx): boolean {
  const input = (tx.input ?? "").trim().toLowerCase();
  return input.length > 2 && input !== "0x";
}

export function computeOnchainScoreFromTxList(
  txs: BasescanNormalTx[],
  watcherLower: string,
  capped: boolean,
  tokenTransfers: number | null = null
): OnchainScoreResult {
  const watcher = normalizeHexAddrField(watcherLower);
  let outgoingTxs = 0;
  let incomingTxs = 0;
  let contractCalls = 0;
  let simpleTransfers = 0;
  let bridgeTxs = 0;
  let deployments = 0;
  let failedTxs = 0;
  const contractsTouched = new Set<string>();
  const addressesTouched = new Set<string>();
  const activeDayKeys = new Set<string>();
  let firstActivityAt: number | null = null;
  let lastActivityAt: number | null = null;

  for (const tx of txs) {
    const from = normalizeHexAddrField(tx.from);
    const to = normalizeHexAddrField(tx.to);
    const ts = txTimestamp(tx);

    if (ts != null) {
      if (firstActivityAt == null || ts < firstActivityAt) firstActivityAt = ts;
      if (lastActivityAt == null || ts > lastActivityAt) lastActivityAt = ts;
      const day = new Date(ts).toISOString().slice(0, 10);
      activeDayKeys.add(day);
    }

    const isOut = watcher !== "" && from === watcher;
    const isIn = watcher !== "" && to === watcher;

    if (!isOut && !isIn) continue;

    if (isFailedTx(tx)) failedTxs += 1;

    if (isOut) {
      outgoingTxs += 1;
      if (isContractCreationRow(tx)) {
        deployments += 1;
      } else if (hasContractInput(tx)) {
        contractCalls += 1;
        if (to) contractsTouched.add(to);
      } else {
        simpleTransfers += 1;
      }
      if (to) {
        addressesTouched.add(to);
        if (isLikelyBridgeTarget(to)) bridgeTxs += 1;
      }
    }

    if (isIn && from) {
      incomingTxs += 1;
      addressesTouched.add(from);
      if (hasContractInput(tx)) contractsTouched.add(from);
    }
  }

  const uniqueContractsTouched = contractsTouched.size;
  const uniqueAddressesTouched = addressesTouched.size;
  const activeDays = activeDayKeys.size;
  const txsAnalyzed = outgoingTxs + incomingTxs;

  const metrics: OnchainScoreMetrics = {
    outgoingTxs,
    incomingTxs,
    totalTxsSeen: txs.length,
    contractCalls,
    simpleTransfers,
    uniqueContractsTouched,
    uniqueAddressesTouched,
    bridgeTxs,
    deployments,
    failedTxs,
    activeDays,
    firstActivityAt,
    lastActivityAt,
    tokenTransfers,
    txsAnalyzed,
    capped,
  };

  const score = Math.min(
    100,
    Math.round(
      Math.log10(outgoingTxs + 1) * 18 +
        Math.log10(uniqueContractsTouched + 1) * 12 +
        Math.log10(uniqueAddressesTouched + 1) * 6 +
        bridgeTxs * 4 +
        deployments * 8 +
        Math.min(activeDays, 90) * 0.35 +
        (tokenTransfers != null ? Math.log10(tokenTransfers + 1) * 5 : 0)
    )
  );

  const grade =
    score >= 75 ? "A" : score >= 50 ? "B" : score >= 25 ? "C" : txsAnalyzed > 0 ? "D" : "—";

  return { score, grade, metrics };
}
