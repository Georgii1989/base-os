import type { BasescanNormalTx } from "@/lib/basescanAccountTx";

const BLOCKSCOUT_BASE_API = "https://base.blockscout.com/api";
const ETHERSCAN_API_V2 = "https://api.etherscan.io/v2/api";
const BASE_CHAIN_ID = "8453";

/** Blockscout returns at most 10k txs per address (see docs). */
const BLOCKSCOUT_MAX_TXS = 10_000;

type TxListResponse =
  | { status: "1"; message: string; result: BasescanNormalTx[] }
  | { status: "0"; message: string; result: string };

function getBlockscoutApiKey(): string {
  return process.env.BLOCKSCOUT_API_KEY?.trim() || "";
}

export function getExplorerApiKey(): string {
  return process.env.BASESCAN_API_KEY?.trim() || process.env.ETHERSCAN_API_KEY?.trim() || "";
}

function buildBlockscoutUrl(params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  const key = getBlockscoutApiKey();
  if (key) search.set("apikey", key);
  return `${BLOCKSCOUT_BASE_API}?${search.toString()}`;
}

export function buildExplorerV2Url(params: Record<string, string>, apiKey: string): string {
  const search = new URLSearchParams({
    chainid: BASE_CHAIN_ID,
    apikey: apiKey,
    ...params,
  });
  return `${ETHERSCAN_API_V2}?${search.toString()}`;
}

function isEmptyTxListMessage(msg: string): boolean {
  const low = msg.toLowerCase();
  return (
    low.includes("no transactions found") ||
    low.includes("no record found") ||
    low.includes("no data found")
  );
}

function isEtherscanFreeTierBaseError(msg: string): boolean {
  const low = msg.toLowerCase();
  return (
    low.includes("free api access is not supported") ||
    low.includes("upgrade your api plan") ||
    low.includes("full chain coverage")
  );
}

async function fetchAddressTxListAllFromUrl(
  buildUrl: (page: number) => string,
  errorPrefix: string,
  options: { maxTxs?: number; offset?: number; sort?: "asc" | "desc" } = {}
): Promise<{ txs: BasescanNormalTx[]; capped: boolean }> {
  const maxTxs = options.maxTxs ?? 25_000;
  const offset = options.offset ?? 1000;
  const txs: BasescanNormalTx[] = [];
  let page = 1;
  let capped = false;

  while (txs.length < maxTxs) {
    const response = await fetch(buildUrl(page), { cache: "no-store" });
    if (!response.ok) throw new Error(`${errorPrefix}http_${response.status}`);

    const json = (await response.json()) as TxListResponse;
    if (json.status === "0" && typeof json.result === "string") {
      if (isEmptyTxListMessage(json.result)) break;
    }
    if (json.status !== "1" || !Array.isArray(json.result)) {
      const msg = typeof json.result === "string" ? json.result : json.message;
      throw new Error(`${errorPrefix}${msg ?? "txlist_failed"}`);
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

async function fetchAddressTxListAllBlockscout(
  address: `0x${string}`,
  options: { maxTxs?: number; offset?: number; sort?: "asc" | "desc" } = {}
): Promise<{ txs: BasescanNormalTx[]; capped: boolean }> {
  const maxTxs = Math.min(options.maxTxs ?? BLOCKSCOUT_MAX_TXS, BLOCKSCOUT_MAX_TXS);
  return fetchAddressTxListAllFromUrl(
    (page) =>
      buildBlockscoutUrl({
        module: "account",
        action: "txlist",
        address,
        startblock: "0",
        endblock: "99999999",
        page: String(page),
        offset: String(options.offset ?? 1000),
        sort: options.sort ?? "desc",
      }),
    "blockscout_",
    { ...options, maxTxs }
  );
}

async function fetchAddressTxListAllEtherscan(
  address: `0x${string}`,
  apiKey: string,
  options: { maxTxs?: number; offset?: number; sort?: "asc" | "desc" } = {}
): Promise<{ txs: BasescanNormalTx[]; capped: boolean }> {
  const offset = options.offset ?? 1000;
  const sort = options.sort ?? "desc";
  const maxTxs = options.maxTxs ?? 25_000;

  return fetchAddressTxListAllFromUrl(
    (page) =>
      buildExplorerV2Url(
        {
          module: "account",
          action: "txlist",
          address,
          startblock: "0",
          endblock: "99999999",
          page: String(page),
          offset: String(offset),
          sort,
        },
        apiKey
      ),
    "etherscan_",
    { maxTxs, offset, sort }
  );
}

const DEFAULT_PER_DIRECTION = 5_000;

async function mergeDescAsc(
  fetchDirection: (
    sort: "asc" | "desc"
  ) => Promise<{ txs: BasescanNormalTx[]; capped: boolean }>
): Promise<{ txs: BasescanNormalTx[]; capped: boolean }> {
  const [desc, asc] = await Promise.all([fetchDirection("desc"), fetchDirection("asc")]);

  const byHash = new Map<string, BasescanNormalTx>();
  for (const tx of desc.txs) {
    const h = (tx.hash ?? "").trim().toLowerCase();
    if (h) byHash.set(h, tx);
  }
  for (const tx of asc.txs) {
    const h = (tx.hash ?? "").trim().toLowerCase();
    if (h) byHash.set(h, tx);
  }

  return { txs: Array.from(byHash.values()), capped: desc.capped || asc.capped };
}

export type TxListSource = "blockscout" | "etherscan";

export async function fetchMergedTxListForOutgoingStats(
  address: `0x${string}`,
  options?: { perDirectionMax?: number; offset?: number }
): Promise<{ txs: BasescanNormalTx[]; capped: boolean; source: TxListSource }> {
  const perDirectionMax = Math.min(
    options?.perDirectionMax ?? DEFAULT_PER_DIRECTION,
    BLOCKSCOUT_MAX_TXS
  );
  const offset = options?.offset ?? 1000;

  try {
    const merged = await mergeDescAsc((sort) =>
      fetchAddressTxListAllBlockscout(address, {
        maxTxs: perDirectionMax,
        offset,
        sort,
      })
    );
    return { ...merged, source: "blockscout" };
  } catch (blockscoutErr) {
    const apiKey = getExplorerApiKey();
    if (!apiKey) throw blockscoutErr;

    try {
      const merged = await mergeDescAsc((sort) =>
        fetchAddressTxListAllEtherscan(address, apiKey, {
          maxTxs: perDirectionMax,
          offset,
          sort,
        })
      );
      return { ...merged, source: "etherscan" };
    } catch (etherscanErr) {
      const etherscanMsg =
        etherscanErr instanceof Error ? etherscanErr.message : String(etherscanErr);
      if (isEtherscanFreeTierBaseError(etherscanMsg)) throw blockscoutErr;
      throw etherscanErr;
    }
  }
}

export async function fetchTokenTransferCountBlockscout(
  address: `0x${string}`
): Promise<number | null> {
  try {
    const res = await fetch(
      buildBlockscoutUrl({
        module: "account",
        action: "tokentx",
        address,
        startblock: "0",
        endblock: "99999999",
        page: "1",
        offset: "10000",
        sort: "desc",
      }),
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { status: string; result: unknown };
    if (json.status !== "1" || !Array.isArray(json.result)) return null;
    return json.result.length;
  } catch {
    return null;
  }
}
