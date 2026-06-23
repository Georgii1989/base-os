"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatEther, getAddress, isAddress } from "viem";
import { useAccount, useSwitchChain } from "wagmi";
import { useX402Fetch } from "@/hooks/useX402Fetch";
import { BASE_CHAIN_ID } from "@/lib/baseChain";
import { OsAddressDisplay } from "@/components/os/OsAddressDisplay";
import { ScoreBreakdown } from "@/components/ScoreBreakdown";
import { ScoreShareActions } from "@/components/ScoreShareActions";
import { formatCompactNumber } from "@/lib/baseAnalyticsFormat";
import { isBasenameLike, resolveAddressInput } from "@/lib/baseBasenames";
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
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#8b5cf6" />
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
    <div className="os-metric-tile">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-amber-50">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

export function OnchainScorePanel({ initialAddress = null }: { initialAddress?: string | null }) {
  const { address: connected, chainId, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const x402Fetch = useX402Fetch();
  const [input, setInput] = useState("");
  const [queryAddress, setQueryAddress] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [x402Error, setX402Error] = useState<string | null>(null);
  const [isX402Loading, setIsX402Loading] = useState(false);
  const [x402Data, setX402Data] = useState<OnchainScorePayload | null>(null);
  const prefilledRef = useRef<string | null>(null);

  useEffect(() => {
    const raw = initialAddress?.trim();
    if (!raw || prefilledRef.current === raw) return;
    prefilledRef.current = raw;
    setInput(raw);
    setResolveError(null);
    setIsResolving(true);
    void (async () => {
      try {
        const resolved = await resolveAddressInput(raw);
        if (resolved) {
          setQueryAddress(resolved);
          return;
        }
        if (isAddress(raw)) {
          setQueryAddress(getAddress(raw));
          return;
        }
        setResolveError(
          isBasenameLike(raw)
            ? "Could not resolve that Base name from the link. Try again."
            : "Invalid address in link."
        );
      } finally {
        setIsResolving(false);
      }
    })();
  }, [initialAddress]);

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

  const runLookup = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setResolveError(null);
    setX402Error(null);
    setX402Data(null);
    setIsResolving(true);
    try {
      const resolved = await resolveAddressInput(trimmed);
      if (!resolved) {
        setResolveError(
          isBasenameLike(trimmed)
            ? "Could not resolve that Base name. Check spelling or try again in a minute."
            : "Enter a valid 0x address or name.base.eth"
        );
        return;
      }
      setQueryAddress(resolved);
    } finally {
      setIsResolving(false);
    }
  }, [input]);

  const runX402Lookup = useCallback(async () => {
    if (!queryAddress || !isAddress(queryAddress)) {
      setX402Error("Analyze an address first, then pay via x402.");
      return;
    }
    if (!isConnected) {
      setX402Error("Connect a wallet on Base mainnet.");
      return;
    }
    if (chainId !== BASE_CHAIN_ID) {
      try {
        await switchChainAsync({ chainId: BASE_CHAIN_ID });
      } catch {
        setX402Error("Switch to Base mainnet in your wallet.");
        return;
      }
    }
    if (!x402Fetch) {
      setX402Error("Wallet signer not ready. Try reconnecting.");
      return;
    }

    setX402Error(null);
    setIsX402Loading(true);
    try {
      const res = await x402Fetch(`/api/x402/score?address=${queryAddress}`);
      const raw = await res.text();
      let json: (OnchainScorePayload & { error?: string; hint?: string }) | null = null;
      if (raw.trim()) {
        try {
          json = JSON.parse(raw) as OnchainScorePayload & { error?: string; hint?: string };
        } catch {
          throw new Error("Server returned invalid JSON. Try again in a moment.");
        }
      }
      if (!res.ok) {
        throw new Error(json?.hint ?? json?.error ?? `x402_payment_failed (${res.status})`);
      }
      if (!json) {
        throw new Error("Empty response from x402 score API.");
      }
      setX402Data(json);
    } catch (err) {
      setX402Error(err instanceof Error ? err.message : "x402_payment_failed");
    } finally {
      setIsX402Loading(false);
    }
  }, [chainId, isConnected, queryAddress, switchChainAsync, x402Fetch]);

  const canAnalyze =
    isAddress(input.trim()) || isBasenameLike(input.trim());

  const m = (x402Data ?? data)?.score.metrics;
  const balanceEth = (x402Data ?? data) ? formatEther(BigInt((x402Data ?? data)!.balanceWei)) : "0";
  const displayData = x402Data ?? data;

  return (
    <div className="grid gap-6">
      <div className="os-panel p-6 md:p-8">
        <p className="os-eyebrow">Base mainnet</p>
        <h2 className="os-display mt-2 text-3xl font-semibold text-white md:text-4xl">Onchain score</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-200/85">
          Paste any Base address to see activity depth: transactions, contracts touched, bridges,
          deployments, and token transfers (when indexed). Free lookup below — or pay ~$0.001 USDC
          on Base via x402 with Builder Code attribution onchain.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runLookup();
            }}
            placeholder="0x… or name.base.eth"
            spellCheck={false}
            className="min-w-0 flex-1 os-input font-mono outline-none"
          />
          <button
            type="button"
            onClick={() => void runLookup()}
            disabled={!canAnalyze || isResolving}
            className="os-cta os-display px-6 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isResolving ? "Resolving…" : "Analyze"}
          </button>
        </div>
        {resolveError ? (
          <p className="mt-2 text-sm text-amber-200/95">{resolveError}</p>
        ) : null}

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
          {queryAddress ? (
            <button
              type="button"
              onClick={() => void runX402Lookup()}
              disabled={isX402Loading || !x402Fetch}
              className="rounded-xl border border-violet-300/40 bg-violet-500/15 px-3 py-1.5 text-xs font-bold text-violet-100 disabled:opacity-40"
            >
              {isX402Loading ? "Paying via x402…" : "Pay via x402 (USDC)"}
            </button>
          ) : null}
          <Link
            href="/safety"
            className="rounded-xl border border-white/12 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white"
          >
            Public address lookup ↗
          </Link>
        </div>
        {x402Error ? <p className="mt-2 text-sm text-rose-200/95">{x402Error}</p> : null}
        {x402Data ? (
          <p className="mt-2 text-xs text-emerald-200/90">
            Paid via x402 on Base mainnet — settlement attributed with Builder Code{" "}
            <span className="font-mono">{process.env.NEXT_PUBLIC_BASE_BUILDER_CODE ?? "bc_59omft8w"}</span>.
          </p>
        ) : null}
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

      {displayData && m ? (
        <>
          {displayData.message ? (
            <p className="rounded-xl border border-amber-300/25 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">
              {displayData.message}
              {displayData.source === "rpc_only" ? " Transaction index unavailable — showing RPC estimate only." : null}
            </p>
          ) : null}

          <ScoreShareActions data={displayData} />

          <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
            <section className="flex flex-col items-center justify-center os-panel p-6">
              <ScoreRing score={displayData.score.score} grade={displayData.score.grade} />
              <p className="mt-4 text-center text-xs text-slate-400">
                Heuristic Base activity score
                <br />
                <span className="text-slate-500">not financial advice</span>
              </p>
            </section>

            <section className="os-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Address</p>
                  <OsAddressDisplay
                    address={displayData.address}
                    showChecksum
                    monoClassName="break-all font-mono text-sm font-bold text-cyan-100"
                  />
                  <p className="mt-2 text-sm text-slate-400">
                    {displayData.isContract ? "Smart contract" : "EOA wallet"} ·{" "}
                    {Number(balanceEth).toFixed(6)} ETH on Base
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://basescan.org/address/${displayData.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-white/15 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    BaseScan ↗
                  </a>
                  <Link
                    href={`/card/${displayData.address}`}
                    className="rounded-xl border border-cyan-300/35 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-100"
                  >
                    Identity card ↗
                  </Link>
                  <Link
                    href={`/${displayData.address}`}
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

          <ScoreBreakdown
            metrics={m}
            tokenTransfers={m.tokenTransfers}
            score={displayData.score.score}
            rpcTxCount={displayData.rpcTxCount}
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile
              label="Outgoing txs"
              value={formatCompactNumber(m.outgoingTxs)}
              hint={`RPC nonce: ${displayData.rpcTxCount.toLocaleString()}`}
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
            {displayData.source === "blockscout"
              ? "Blockscout (Base)"
              : displayData.source === "etherscan"
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
