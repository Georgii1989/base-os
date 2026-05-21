import { getAddress, isAddress } from "viem";
import { getBasePublicClient } from "@/lib/baseRpcPublic";
import {
  fetchMergedTxListForOutgoingStats,
  fetchTokenTransferCountBlockscout,
  type TxListSource,
} from "@/lib/accountTxListFetch";
import {
  computeOnchainScoreFromTxList,
  type OnchainScoreResult,
} from "@/lib/onchainScoreCompute";
import type { BasescanNormalTx } from "@/lib/basescanAccountTx";

export type OnchainScorePayload = {
  address: `0x${string}`;
  isContract: boolean;
  balanceWei: string;
  rpcTxCount: number;
  score: OnchainScoreResult;
  source: TxListSource | "rpc_only";
  message?: string;
};

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

  const [{ txs, capped, source }, tokenTransfers] = await Promise.all([
    fetchMergedTxListForOutgoingStats(address, {
      perDirectionMax: 5_000,
      offset: 1000,
    }),
    fetchTokenTransferCountBlockscout(address),
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
    source,
    message: capped
      ? "History capped at Blockscout index limits (~10k txs) — score may be a lower bound."
      : undefined,
  };
}

export function formatExplorerErrorMessage(raw: string): string {
  const stripped = raw.replace(/^(blockscout_|etherscan_|basescan_)/i, "");
  if (stripped.toLowerCase().includes("free api access is not supported")) {
    return "Etherscan free API does not include Base. The app uses Blockscout instead — retry in a moment.";
  }
  return stripped || "Could not load transaction history.";
}
