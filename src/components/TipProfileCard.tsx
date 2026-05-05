"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatEther, parseAbiItem } from "viem";
import { usePublicClient } from "wagmi";

type TipEntry = {
  id: string;
  amountEth: string;
  message: string;
  txHash: `0x${string}`;
  blockNumber: bigint;
};

const DEFAULT_TIPJAR = "0x47ad142c4f04431164737cACD601796932b7357A";
const DEFAULT_PROFILE_LOOKBACK = BigInt(100_000);
const LOGS_CHUNK_SIZE = BigInt(2_500);

export function TipProfileCard({ address }: { address: `0x${string}` }) {
  const publicClient = usePublicClient();
  const [tips, setTips] = useState<TipEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [historyHint, setHistoryHint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const tipSourceAddress = process.env.NEXT_PUBLIC_TIPJAR_ADDRESS || DEFAULT_TIPJAR;
  const profileFromBlockEnv = process.env.NEXT_PUBLIC_TIP_PROFILE_FROM_BLOCK;
  const sourceContracts = useMemo(() => {
    const normalized = new Set<string>([
      tipSourceAddress.toLowerCase(),
      DEFAULT_TIPJAR.toLowerCase(),
    ]);
    return Array.from(normalized) as `0x${string}`[];
  }, [tipSourceAddress]);

  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;
    const tipEvent = parseAbiItem("event TipReceived(address indexed from, uint256 amount, string message)");

    async function fetchLogsChunked(contractAddress: `0x${string}`, fromBlock: bigint, toBlock: bigint) {
      const allLogs = [];
      let start = fromBlock;
      while (start <= toBlock) {
        const end =
          start + LOGS_CHUNK_SIZE - BigInt(1) > toBlock
            ? toBlock
            : start + LOGS_CHUNK_SIZE - BigInt(1);
        const chunk = await publicClient.getLogs({
          address: contractAddress,
          event: tipEvent,
          args: { from: address },
          fromBlock: start,
          toBlock: end,
        });
        allLogs.push(...chunk);
        start = end + BigInt(1);
      }
      return allLogs;
    }

    async function loadProfileTips() {
      setIsLoading(true);
      try {
        const latestBlock = await publicClient.getBlockNumber();
        const configuredFromBlock =
          profileFromBlockEnv && /^[0-9]+$/.test(profileFromBlockEnv)
            ? BigInt(profileFromBlockEnv)
            : null;
        const fromBlock =
          configuredFromBlock ??
          (latestBlock > DEFAULT_PROFILE_LOOKBACK
            ? latestBlock - DEFAULT_PROFILE_LOOKBACK
            : BigInt(0));

        const logsBySource = await Promise.allSettled(
          sourceContracts.map((contract) => fetchLogsChunked(contract, fromBlock, latestBlock))
        );
        const logs = logsBySource
          .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchLogsChunked>>> =>
            result.status === "fulfilled"
          )
          .flatMap((result) => result.value);

        const hasFailures = logsBySource.some((result) => result.status === "rejected");

        if (cancelled) return;

        const mapped = logs
          .map((log) => {
            const args = log.args as { amount?: bigint; message?: string };
            if (args.amount === undefined || !log.transactionHash) return null;
            return {
              id: `${log.transactionHash}-${log.logIndex?.toString() ?? "0"}`,
              amountEth: Number(formatEther(args.amount)).toFixed(6),
              message: args.message?.trim() ? args.message : "(no message)",
              txHash: log.transactionHash,
              blockNumber: log.blockNumber ?? BigInt(0),
            };
          })
          .filter((entry): entry is TipEntry => entry !== null)
          .sort((a, b) => (a.blockNumber === b.blockNumber ? 0 : a.blockNumber > b.blockNumber ? -1 : 1));

        setTips(mapped.slice(0, 20));
        setError(hasFailures ? "Some sources failed to load, showing partial history." : null);
        setHistoryHint(
          configuredFromBlock
            ? null
            : "Showing tips from the last ~100k blocks. Set NEXT_PUBLIC_TIP_PROFILE_FROM_BLOCK for full history."
        );
      } catch {
        if (!cancelled) {
          setError("Unable to load profile tips.");
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
  }, [publicClient, address, profileFromBlockEnv, sourceContracts]);

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
          <p className="text-sm text-sky-100/90">No tip events found for this address yet.</p>
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
