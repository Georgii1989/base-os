"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatEther, getAddress, isAddress, parseAbiItem, type AbiEvent } from "viem";
import { usePublicClient } from "wagmi";

type TipEntry = {
  id: string;
  amountEth: string;
  message: string;
  txHash: `0x${string}`;
  blockNumber: bigint;
};

const DEFAULT_TIPJAR = "0x47ad142c4f04431164737cACD601796932b7357A";
/** Narrower window keeps public RPCs from failing on huge eth_getLogs ranges. Override with NEXT_PUBLIC_TIP_PROFILE_FROM_BLOCK. */
const DEFAULT_PROFILE_LOOKBACK = BigInt(25_000);
const LOGS_CHUNK_SIZE = BigInt(1_500);

const TIP_RECEIVED_ABI = parseAbiItem(
  "event TipReceived(address indexed from, uint256 amount, string message)"
) as AbiEvent;

function parseCommaAddresses(raw: string | undefined): `0x${string}`[] {
  if (!raw?.trim()) return [];
  const out: `0x${string}`[] = [];
  for (const piece of raw.split(",")) {
    const t = piece.trim();
    if (isAddress(t)) out.push(getAddress(t));
  }
  return out;
}

function parseFromBlockEnv(value: string | undefined): bigint | null {
  if (!value?.trim()) return null;
  const t = value.trim();
  if (!/^\d+$/.test(t)) return null;
  try {
    return BigInt(t);
  } catch {
    return null;
  }
}

export function TipProfileCard({ address }: { address: `0x${string}` }) {
  const publicClient = usePublicClient();
  const [tips, setTips] = useState<TipEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [historyHint, setHistoryHint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const tipSourceAddress = process.env.NEXT_PUBLIC_TIPJAR_ADDRESS || DEFAULT_TIPJAR;
  const profileFromBlockEnvRaw = process.env.NEXT_PUBLIC_TIP_PROFILE_FROM_BLOCK;
  const extraContractsRaw = process.env.NEXT_PUBLIC_TIP_PROFILE_CONTRACTS;

  const sourceContracts = useMemo(() => {
    const lower = new Set<string>();
    const candidates = [tipSourceAddress, DEFAULT_TIPJAR, ...parseCommaAddresses(extraContractsRaw)];
    for (const candidate of candidates) {
      const t = candidate?.trim();
      if (!t) continue;
      if (isAddress(t)) lower.add(getAddress(t).toLowerCase());
    }
    return Array.from(lower, (hex) => getAddress(hex)) as `0x${string}`[];
  }, [tipSourceAddress, extraContractsRaw]);

  const watcherFrom = useMemo(() => parseFromBlockEnv(profileFromBlockEnvRaw), [profileFromBlockEnvRaw]);

  useEffect(() => {
    if (!publicClient) return undefined;

    let cancelled = false;

    async function fetchLogsChunked(
      contractAddress: `0x${string}`,
      fromBlock: bigint,
      toBlock: bigint,
      fromWallet: `0x${string}`
    ): Promise<{ logs: Awaited<ReturnType<typeof publicClient.getLogs>>; failedChunks: number }> {
      const allLogs: Awaited<ReturnType<typeof publicClient.getLogs>> = [];
      let start = fromBlock;
      let failedChunks = 0;

      while (start <= toBlock) {
        const end =
          start + LOGS_CHUNK_SIZE - BigInt(1) > toBlock
            ? toBlock
            : start + LOGS_CHUNK_SIZE - BigInt(1);
        let ok = false;
        for (let attempt = 0; attempt < 2 && !ok; attempt++) {
          try {
            const chunk = await publicClient.getLogs({
              address: contractAddress,
              event: TIP_RECEIVED_ABI,
              args: { from: fromWallet },
              fromBlock: start,
              toBlock: end,
            });
            allLogs.push(...chunk);
            ok = true;
          } catch {
            await new Promise((r) => setTimeout(r, 350));
          }
        }
        if (!ok) failedChunks++;
        start = end + BigInt(1);
      }
      return { logs: allLogs, failedChunks };
    }

    async function loadProfileTips() {
      setIsLoading(true);
      setError(null);


      try {
        const latestBlock = await publicClient.getBlockNumber();
        if (cancelled) return;

        const fromWallet = getAddress(address);
        const configuredFromBlock = watcherFrom;
        let fromBlock: bigint;
        if (configuredFromBlock !== null) {
          fromBlock = configuredFromBlock;
        } else if (latestBlock > DEFAULT_PROFILE_LOOKBACK) {
          fromBlock = latestBlock - DEFAULT_PROFILE_LOOKBACK;
        } else {
          fromBlock = BigInt(0);
        }

        if (sourceContracts.length === 0) {
          if (!cancelled) {
            setTips([]);
            setError("Configure at least one valid tip contract address (NEXT_PUBLIC_TIPJAR_ADDRESS).");
            setIsLoading(false);
          }
          return;
        }

        const results = await Promise.allSettled(
          sourceContracts.map((contract) =>
            fetchLogsChunked(contract, fromBlock, latestBlock, fromWallet)
          )
        );

        const flat: Awaited<ReturnType<typeof publicClient.getLogs>> = [];
        let aggregatedFailedChunks = 0;

        let contractLevelRejections = 0;

        for (const result of results) {
          if (result.status === "rejected") {
            contractLevelRejections++;
            continue;
          }
          flat.push(...result.value.logs);
          aggregatedFailedChunks += result.value.failedChunks;
        }

        const span = latestBlock >= fromBlock ? latestBlock - fromBlock + BigInt(1) : BigInt(0);
        const windowsPerContract =
          span > BigInt(0) ? Number((span + LOGS_CHUNK_SIZE - BigInt(1)) / LOGS_CHUNK_SIZE) : 0;

        const seenTxIndex = new Set<string>();
        const dedup = flat.filter((log) => {
          const k = `${log.transactionHash}-${String(log.logIndex)}`;
          if (seenTxIndex.has(k)) return false;
          seenTxIndex.add(k);
          return true;
        });

        if (cancelled) return;

        const mapped = dedup
          .map((log) => {
            const row = log as {
              transactionHash?: `0x${string}` | null;
              logIndex?: number | null;
              blockNumber?: bigint | null;
              args?: { amount?: bigint; message?: string };
            };
            const args = row.args ?? {};
            if (args.amount === undefined || !row.transactionHash) return null;
            return {
              id: `${row.transactionHash}-${row.logIndex?.toString() ?? "0"}`,
              amountEth: Number(formatEther(args.amount)).toFixed(6),
              message: args.message?.trim() ? args.message : "(no message)",
              txHash: row.transactionHash,
              blockNumber: row.blockNumber ?? BigInt(0),
            };
          })
          .filter((entry): entry is TipEntry => entry !== null)
          .sort((a, b) => (a.blockNumber === b.blockNumber ? 0 : a.blockNumber > b.blockNumber ? -1 : 1));

        setTips(mapped.slice(0, 20));

        const rpcProbablyDead =
          mapped.length === 0 &&
          (contractLevelRejections === results.length ||
            (windowsPerContract > 0 &&
              aggregatedFailedChunks >= windowsPerContract * sourceContracts.length));

        if (mapped.length === 0) {
          if (rpcProbablyDead) {
            setError(
              "Unable to load profile tips — the RPC rejected log scans. Fix: set NEXT_PUBLIC_TIP_PROFILE_FROM_BLOCK to your TipJar or router deployment block (smaller window), and optionally NEXT_PUBLIC_TIP_PROFILE_CONTRACTS listing router and TipJar comma-separated."
            );
            setHistoryHint(null);
          } else if (aggregatedFailedChunks > 0) {
            setError(null);
            setHistoryHint(
              "Some block ranges failed (RPC limits). Set NEXT_PUBLIC_TIP_PROFILE_FROM_BLOCK to the deployment block for a shorter, reliable scan."
            );
          } else {
            setError(null);
            setHistoryHint(
              configuredFromBlock === null
                ? "No tips in the recent window. If this wallet tipped earlier, set NEXT_PUBLIC_TIP_PROFILE_FROM_BLOCK to the deployment block."
                : null
            );
          }
        } else {
          setError(null);
          if (aggregatedFailedChunks > 0 || contractLevelRejections > 0) {
            setHistoryHint(
              "Some RPC responses were incomplete — list may miss older tips unless NEXT_PUBLIC_TIP_PROFILE_FROM_BLOCK is set."
            );
          } else {
            setHistoryHint(
              configuredFromBlock === null
                ? "Showing tips from a recent block window only. Set NEXT_PUBLIC_TIP_PROFILE_FROM_BLOCK for full history."
                : null
            );
          }
        }
      } catch {
        if (!cancelled) {
          setError(
            "Unable to load profile tips (network error). Check your connection or RPC limits for this chain."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProfileTips();
    return () => {
      cancelled = true;
    };
  }, [publicClient, address, watcherFrom, sourceContracts]);

  const totalEth = useMemo(
    () => tips.reduce((sum, item) => sum + Number(item.amountEth), 0).toFixed(6),
    [tips]
  );

  const maxEth = useMemo(
    () => (tips.length === 0 ? "0.000000" : Math.max(...tips.map((item) => Number(item.amountEth))).toFixed(6)),
    [tips]
  );

  return (
    <section className="relative z-10 w-full max-w-3xl rounded-3xl border border-white/15 bg-black/45 p-5 text-white shadow-[0_0_50px_rgba(76,29,149,0.45)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-sky-200 md:text-4xl">Tip Profile</h1>
        <Link href="/" className="rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold">
          Back to app
        </Link>
      </div>

      <p className="mt-3 text-sm text-sky-100/90 break-all">{address}</p>

      <div className="mt-4 grid gap-3 rounded-2xl border border-sky-300/30 bg-slate-950/50 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Total tipped</p>
          <p className="text-lg font-black text-sky-100">{totalEth} ETH</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Tips count</p>
          <p className="text-lg font-black text-sky-100">{tips.length}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Biggest tip</p>
          <p className="text-lg font-black text-sky-100">{maxEth} ETH</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 rounded-2xl border border-sky-300/30 bg-slate-950/50 p-4">
        <h2 className="text-lg font-black text-sky-200">Recent tips</h2>
        {isLoading ? <p className="text-sm text-sky-100/90">Loading onchain tips...</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {historyHint ? <p className="text-sm text-amber-200/95">{historyHint}</p> : null}
        {!isLoading && !error && tips.length === 0 ? (
          <p className="text-sm text-sky-100/90">No tip events found for this address in the scanned window.</p>
        ) : null}
        {!isLoading && !error && tips.length > 0 ? (
          <div className="grid gap-2">
            {tips.map((tip) => (
              <div key={tip.id} className="rounded-xl border border-sky-200/20 bg-sky-950/25 p-3 text-sm">
                <p className="font-bold text-sky-100">{tip.amountEth} ETH</p>
                <p className="text-sky-100/90">{tip.message}</p>
                <a
                  href={`https://basescan.org/tx/${tip.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-cyan-300 underline"
                >
                  {tip.txHash.slice(0, 10)}...{tip.txHash.slice(-8)}
                </a>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
