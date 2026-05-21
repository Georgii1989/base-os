import { getAddress, isAddress } from "viem";
import { getBasePublicClient } from "@/lib/baseRpcPublic";
import {
  computeOnchainScoreFromTxList,
  type OnchainScoreResult,
} from "@/lib/onchainScoreCompute";
import {
  buildExplorerV2Url,
  fetchMergedTxListForOutgoingStats,
  getExplorerApiKey,
  type BasescanNormalTx,
} from "@/lib/basescanAccountTx";

export type OnchainScorePayload = {
  address: `0x${string}`;
  isContract: boolean;
  balanceWei: string;
  rpcTxCount: number;
  score: OnchainScoreResult;
  source: "basescan" | "rpc_only";
  message?: string;
};

async function fetchTokenTransferCount(
  address: `0x${string}`,
  apiKey: string
): Promise<number | null> {
  try {
    const res = await fetch(
      buildExplorerV2Url(
        {
          module: "account",
          action: "tokentx",
          address,
          startblock: "0",
          endblock: "99999999",
          page: "1",
          offset: "10000",
          sort: "desc",
        },
        apiKey
      ),
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

export async function fetchOnchainScore(addressRaw: string): Promise<OnchainScorePayload | null> {
  if (!isAddress(addressRaw)) return null;
  const address = getAddress(addressRaw);
  const client = getBasePublicClient();
  const watcherLower = address.toLowerCase();

  const [bytecode, balance, rpcTxCount] = await Promise.all([
    client.getBytecode({ address }),
    client.getBalance({ address }),
    client.getTransactionCount({ address }),
  ]);

  const isContract = Boolean(bytecode && bytecode !== "0x" && bytecode.length > 2);
  const apiKey = getExplorerApiKey();

  if (!apiKey) {
    const emptyScore = computeOnchainScoreFromTxList([], watcherLower, false, null);
    return {
      address,
      isContract,
      balanceWei: balance.toString(),
      rpcTxCount,
      score: {
        ...emptyScore,
        score: Math.min(100, Math.round(Math.log10(rpcTxCount + 1) * 22)),
        grade: rpcTxCount > 50 ? "B" : rpcTxCount > 10 ? "C" : rpcTxCount > 0 ? "D" : "—",
      },
      source: "rpc_only",
      message:
        "Full history needs Basescan API on the server. Showing nonce-based estimate only.",
    };
  }

  const [{ txs, capped }, tokenTransfers] = await Promise.all([
    fetchMergedTxListForOutgoingStats(address, apiKey, {
      perDirectionMax: 12_000,
      offset: 1000,
    }),
    fetchTokenTransferCount(address, apiKey),
  ]);

  const score = computeOnchainScoreFromTxList(
    txs as BasescanNormalTx[],
    watcherLower,
    capped,
    tokenTransfers
  );

  return {
    address,
    isContract,
    balanceWei: balance.toString(),
    rpcTxCount,
    score,
    source: "basescan",
    message: capped
      ? "History truncated at ~24k txs — score is a lower bound."
      : undefined,
  };
}
