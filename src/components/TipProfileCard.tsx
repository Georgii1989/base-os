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

import { OsAddressDisplay } from "@/components/os/OsAddressDisplay";
import { OsMetricTile } from "@/components/os/OsChrome";
import { resolveTipJarAddress } from "@/lib/tipContracts";
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

  const tipSourceAddress = resolveTipJarAddress();
  const profileFromBlockEnvRaw = process.env.NEXT_PUBLIC_TIP_PROFILE_FROM_BLOCK;
  const extraContractsRaw = process.env.NEXT_PUBLIC_TIP_PROFILE_CONTRACTS;

  const sourceContracts = useMemo(() => {
    const lower = new Set<string>();
    const candidates = [tipSourceAddress, resolveTipJarAddress(), ...parseCommaAddresses(extraContractsRaw)];
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
            setError("Tip contract isn’t set up in this app build.");
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
              "Couldn’t load tips (network busy). Try again later."
            );
            setHistoryHint(null);
          } else if (aggregatedFailedChunks > 0) {
            setError(null);
            setHistoryHint(
              "Some data may be missing. The site can narrow the time range in settings."
            );
          } else {
            setError(null);
            setHistoryHint(
              configuredFromBlock === null
                ? "Only recent tips are shown. Older tips may need a wider range in site settings."
                : null
            );
          }
        } else {
          setError(null);
          if (aggregatedFailedChunks > 0 || contractLevelRejections > 0) {
            setHistoryHint(
              "List might be incomplete — network hiccup."
            );
          } else {
            setHistoryHint(
              configuredFromBlock === null
                ? "Showing recent tips only. Full history may need site settings."
                : null
            );
          }
        }
      } catch {
        if (!cancelled) {
          setError(
            "Couldn’t load tips. Check your connection."
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
    <section className="os-panel mx-auto w-full max-w-3xl p-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="os-eyebrow">Tips</p>
          <h1 className="os-display mt-1 text-2xl font-semibold text-white md:text-3xl">Public tip page</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/safety/${address}`} className="os-cta-ghost px-3 py-1.5 text-xs">
            Address lookup
          </Link>
          <Link href="/" className="os-cta-ghost px-3 py-1.5 text-xs">
            Home
          </Link>
        </div>
      </div>

      <div className="mt-3">
        <OsAddressDisplay address={address} showChecksum monoClassName="break-all font-mono text-sm text-slate-400" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <OsMetricTile label="Total tipped" value={`${totalEth} ETH`} accent="gold" />
        <OsMetricTile label="# Tips" value={tips.length} accent="violet" />
        <OsMetricTile label="Biggest tip" value={`${maxEth} ETH`} accent="amber" />
      </div>

      <div className="mt-4 os-panel grid gap-2 p-4">
        <h2 className="os-display text-lg font-semibold text-white">Recent tips</h2>
        {isLoading ? <p className="text-sm text-slate-400">Loading…</p> : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {historyHint ? <p className="text-sm text-amber-200/95">{historyHint}</p> : null}
        {!isLoading && !error && tips.length === 0 ? (
          <p className="text-sm text-slate-400">No tips found for this address in the time range we checked.</p>
        ) : null}
        {!isLoading && !error && tips.length > 0 ? (
          <div className="grid gap-2">
            {tips.map((tip) => (
              <div key={tip.id} className="os-metric-tile p-3 text-sm">
                <p className="font-bold text-amber-100">{tip.amountEth} ETH</p>
                <p className="text-slate-300">{tip.message}</p>
                <a
                  href={`https://basescan.org/tx/${tip.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-violet-300 underline hover:text-violet-200"
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
