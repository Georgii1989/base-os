import { getAddress, isAddress } from "viem";

const BASESCAN_API = "https://api.basescan.org/api";

export type BasescanNormalTx = {
  blockNumber?: string;
  from?: string;
  to?: string;
  hash?: string;
  input?: string;
  /** Present on some contract-creation rows */
  contractAddress?: string;
};

export type AddressTxStats = {
  deployments: number;
  /** Unique non-empty \`to\` on outgoing normal txs (wallets + contracts). */
  uniqueSendTargets: number;
  txsAnalyzed: number;
  capped: boolean;
};

/** Basescan occasionally omits the 0x prefix on addresses. */
export function normalizeHexAddrField(raw: string | undefined): string {
  const t = (raw ?? "").trim().toLowerCase();
  if (!t) return "";
  if (t.startsWith("0x")) return t.length === 42 ? t : "";
  if (/^[0-9a-f]{40}$/.test(t)) return `0x${t}`;
  return "";
}

/** Normal txlist row: contract creation has no \`to\` address. */
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
  /** Lowercase 0x-prefixed address we are tracking — only outgoing txs (\`from\` matches). */
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

type BasescanTxListResponse =
  | { status: "1"; message: string; result: BasescanNormalTx[] }
  | { status: "0"; message: string; result: string };

/** One direction of txlist pages until short page or max txs. */
export async function fetchAddressTxListAll(
  address: `0x${string}`,
  apiKey: string,
  options: { maxTxs?: number; offset?: number; sort?: "asc" | "desc" } = {}
): Promise<{ txs: BasescanNormalTx[]; capped: boolean }> {
  const maxTxs = options.maxTxs ?? 25_000;
  const offset = options.offset ?? 1000;
  const sort = options.sort ?? "desc";
  const txs: BasescanNormalTx[] = [];
  let page = 1;
  let capped = false;

  while (txs.length < maxTxs) {
    const params = new URLSearchParams({
      module: "account",
      action: "txlist",
      address,
      startblock: "0",
      endblock: "99999999",
      page: String(page),
      offset: String(offset),
      sort,
      apikey: apiKey,
    });
    const url = `${BASESCAN_API}?${params.toString()}`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`basescan_http_${response.status}`);

    const json = (await response.json()) as BasescanTxListResponse;
    if (json.status === "0" && typeof json.result === "string") {
      const low = json.result.toLowerCase();
      if (
        low.includes("no transactions found") ||
        low.includes("no record found") ||
        low.includes("no data found")
      ) {
        break;
      }
    }
    if (json.status !== "1" || !Array.isArray(json.result)) {
      const msg = typeof json.result === "string" ? json.result : json.message;
      throw new Error(`basescan_${msg ?? "txlist_failed"}`);
    }

    const batch = json.result;
    if (batch.length === 0) break;

    txs.push(...batch);
    if (txs.length >= maxTxs) {
      txs.length = maxTxs;
      capped = true;
      break;
    }
    if (batch.length < offset) break;
    page += 1;
  }

  return { txs, capped };
}

const DEFAULT_PER_DIRECTION = 14_000;

/** Merge newest + oldest slices so outgoing txs are not lost when recent activity is mostly incoming. */
export async function fetchMergedTxListForOutgoingStats(
  address: `0x${string}`,
  apiKey: string,
  options?: { perDirectionMax?: number; offset?: number }
): Promise<{ txs: BasescanNormalTx[]; capped: boolean }> {
  const perDirectionMax = options?.perDirectionMax ?? DEFAULT_PER_DIRECTION;
  const offset = options?.offset ?? 1000;

  const [desc, asc] = await Promise.all([
    fetchAddressTxListAll(address, apiKey, {
      maxTxs: perDirectionMax,
      offset,
      sort: "desc",
    }),
    fetchAddressTxListAll(address, apiKey, {
      maxTxs: perDirectionMax,
      offset,
      sort: "asc",
    }),
  ]);

  const byHash = new Map<string, BasescanNormalTx>();
  for (const tx of desc.txs) {
    const h = (tx.hash ?? "").trim().toLowerCase();
    if (h) byHash.set(h, tx);
  }
  for (const tx of asc.txs) {
    const h = (tx.hash ?? "").trim().toLowerCase();
    if (h) byHash.set(h, tx);
  }

  const txs = Array.from(byHash.values());
  const capped = desc.capped || asc.capped;

  return { txs, capped };
}
