import { getAddress, isAddress } from "viem";

export type BasescanNormalTx = {
  blockNumber?: string;
  timeStamp?: string;
  from?: string;
  to?: string;
  hash?: string;
  input?: string;
  isError?: string;
  txreceipt_status?: string;
  /** Present on some contract-creation rows */
  contractAddress?: string;
};

export type AddressTxStats = {
  deployments: number;
  /** Unique non-empty `to` on outgoing normal txs (wallets + contracts). */
  uniqueSendTargets: number;
  txsAnalyzed: number;
  capped: boolean;
};

/** Basescan / Blockscout occasionally omit the 0x prefix on addresses. */
export function normalizeHexAddrField(raw: string | undefined): string {
  const t = (raw ?? "").trim().toLowerCase();
  if (!t) return "";
  if (t.startsWith("0x")) return t.length === 42 ? t : "";
  if (/^[0-9a-f]{40}$/.test(t)) return `0x${t}`;
  return "";
}

/** Normal txlist row: contract creation has no `to` address. */
function isContractCreationRow(tx: BasescanNormalTx): boolean {
  const to = (tx.to ?? "").trim();
  return to === "" || to === "0x";
}

function normalizeRecipient(tx: BasescanNormalTx): `0x${string}` | null {
  const rawFull = normalizeHexAddrField(tx.to);
  if (!rawFull) return null;
  if (!isAddress(rawFull)) return null;
  return getAddress(rawFull);
}

export function computeStatsFromTxList(
  txs: BasescanNormalTx[],
  /** Lowercase 0x-prefixed address we are tracking — only outgoing txs (`from` matches). */
  watcherLower: string
): Omit<AddressTxStats, "capped"> {
  let deployments = 0;
  const targets = new Set<string>();
  let txsAnalyzed = 0;

  for (const tx of txs) {
    const from = normalizeHexAddrField(tx.from);
    if (!from || from !== watcherLower) continue;

    txsAnalyzed += 1;
    if (isContractCreationRow(tx)) deployments += 1;

    const recipient = normalizeRecipient(tx);
    if (recipient) targets.add(recipient.toLowerCase());
  }

  return {
    deployments,
    uniqueSendTargets: targets.size,
    txsAnalyzed,
  };
}
