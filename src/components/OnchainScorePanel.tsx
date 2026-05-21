"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatEther, isAddress } from "viem";
import { useAccount } from "wagmi";
import { ScoreShareActions } from "@/components/ScoreShareActions";
import { formatCompactNumber } from "@/lib/baseAnalyticsFormat";
import type { OnchainScorePayload } from "@/lib/onchainScoreFetch";

function formatDate(ts: number | null): string {
  if (ts == null) return "—";
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative mx-auto grid h-36 w-36 place-items-center">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#e879f9" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-black text-white">{score}</p>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/90">
          Grade {grade}
        </p>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function OnchainScorePanel() {
  const { address: connected } = useAccount();
  const [input, setInput] = useState("");
  const [queryAddress, setQueryAddress] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["onchain-score", queryAddress],
    queryFn: async (): Promise<OnchainScorePayload> => {
      const res = await fetch(`/api/onchain-score?address=${queryAddress}`);
      const json = (await res.json()) as OnchainScorePayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "fetch_failed");
      return json;
    },
    enabled: Boolean(queryAddress && isAddress(queryAddress)),
    staleTime: 120_000,
    retry: 1,
  });

  const runLookup = useCallback(() => {
    const trimmed = input.trim();
    if (!isAddress(trimmed)) return;
    setQueryAddress(trimmed);
  }, [input]);

  const m = data?.score.metrics;
  const balanceEth = data ? formatEther(BigInt(data.balanceWei)) : "0";

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border border-cyan-300/25 bg-slate-950/55 p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-200/90">Base mainnet</p>
        <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">Onchain score</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-200/85">
          Paste any Base address to see activity depth: transactions, contracts touched, bridges,
          deployments, and token transfers (when indexed).
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runLookup();
            }}
            placeholder="0x… Base address"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"
          />
          <button
            type="button"
            onClick={runLookup}
            disabled={!isAddress(input.trim())}
            className="rounded-2xl bg-gradient-to-r from-cyan-500/90 to-fuchsia-500/80 px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Analyze
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {connected ? (
            <button
              type="button"
              onClick={() => {
                setInput(connected);
                setQueryAddress(connected);
              }}
              className="rounded-xl border border-cyan-300/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-100"
            >
              Use connected wallet
            </button>
          ) : null}
          <Link
            href="/safety"
            className="rounded-xl border border-white/12 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white"
          >
            Public address lookup ↗
          </Link>
        </div>
      </div>

      {isLoading || isFetching ? (
        <div className="animate-pulse space-y-4">
          <div className="h-48 rounded-3xl bg-white/5" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/5" />
            ))}
          </div>
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-3xl border border-rose-300/30 bg-rose-500/10 p-6 text-rose-100">
          <p className="font-bold">Could not load onchain score.</p>
          <p className="mt-2 text-sm">
            {error instanceof Error ? error.message : "Try again in a moment."}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-xl border border-rose-200/40 px-4 py-2 text-sm font-bold"
          >
            Retry
          </button>
        </div>
      ) : null}

      {data && m ? (
        <>
          {data.message ? (
            <p className="rounded-xl border border-amber-300/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
              {data.message}
              {data.source === "rpc_only" ? " Transaction index unavailable — showing RPC estimate only." : null}
            </p>
          ) : null}

          <ScoreShareActions data={data} />

          <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
            <section className="flex flex-col items-center justify-center rounded-3xl border border-fuchsia-300/20 bg-slate-950/50 p-6">
              <ScoreRing score={data.score.score} grade={data.score.grade} />
              <p className="mt-4 text-center text-xs text-slate-400">
                Heuristic Base activity score
                <br />
                <span className="text-slate-500">not financial advice</span>
              </p>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Address</p>
                  <p className="break-all font-mono text-sm font-bold text-cyan-100">{data.address}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    {data.isContract ? "Smart contract" : "EOA wallet"} ·{" "}
                    {Number(balanceEth).toFixed(6)} ETH on Base
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://basescan.org/address/${data.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-white/15 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    BaseScan ↗
                  </a>
                  <Link
                    href={`/${data.address}`}
                    className="rounded-xl border border-fuchsia-300/35 bg-fuchsia-500/15 px-3 py-1.5 text-xs font-bold text-fuchsia-100"
                  >
                    Tip profile
                  </Link>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <MetricTile
                  label="First on Base"
                  value={formatDate(m.firstActivityAt)}
                  hint="Earliest indexed tx"
                />
                <MetricTile
                  label="Last active"
                  value={formatDate(m.lastActivityAt)}
                  hint={`${m.activeDays} active days`}
                />
              </div>
            </section>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="Outgoing txs"
              value={formatCompactNumber(m.outgoingTxs)}
              hint={`RPC nonce: ${data.rpcTxCount.toLocaleString()}`}
            />
            <MetricTile
              label="Incoming txs"
              value={formatCompactNumber(m.incomingTxs)}
              hint="Received on Base"
            />
            <MetricTile
              label="Contracts touched"
              value={formatCompactNumber(m.uniqueContractsTouched)}
              hint={`${m.contractCalls} contract calls`}
            />
            <MetricTile
              label="Unique addresses"
              value={formatCompactNumber(m.uniqueAddressesTouched)}
              hint="Counterparties"
            />
            <MetricTile
              label="Bridge-like txs"
              value={formatCompactNumber(m.bridgeTxs)}
              hint="Known bridge contracts"
            />
            <MetricTile
              label="Deployments"
              value={formatCompactNumber(m.deployments)}
              hint="Contract creations"
            />
            <MetricTile
              label="Token transfers"
              value={
                m.tokenTransfers != null ? formatCompactNumber(m.tokenTransfers) : "—"
              }
              hint="ERC-20 movements (sample)"
            />
            <MetricTile
              label="Failed txs"
              value={formatCompactNumber(m.failedTxs)}
              hint={m.capped ? "History capped — may be higher" : "In analyzed set"}
            />
          </div>

          <p className="text-center text-xs text-slate-500">
            Data via{" "}
            {data.source === "blockscout"
              ? "Blockscout (Base)"
              : data.source === "etherscan"
                ? "Etherscan API"
                : "RPC nonce"}{" "}
            ·{" "}
            {m.txsAnalyzed.toLocaleString()} txs analyzed
            {m.capped ? " (capped)" : ""}
          </p>
        </>
      ) : null}

      {!queryAddress && !isLoading ? (
        <p className="text-center text-sm text-slate-500">
          Enter a Base address and tap Analyze to see your onchain score.
        </p>
      ) : null}
    </div>
  );
}
