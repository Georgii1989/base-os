"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatEther, isAddress } from "viem";
import { base } from "wagmi/chains";
import { useAccount, useBalance, useConnect, useSwitchChain } from "wagmi";
import { connectorButtonLabel, pickPreferredConnector } from "@/lib/walletConnectors";
import type { PortfolioToken, WalletPortfolioPayload } from "@/lib/walletPortfolioFetch";
import { shortenAddressDisplay } from "@/lib/knownBaseProtocols";
import {
  buildPortfolioSwapBuyHref,
  buildPortfolioSwapSellHref,
  buildSwapTabHref,
} from "@/lib/swapPrefill";

function formatUsd(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(2)}`;
  return "<$0.01";
}

function actionBtnClass(accent: "sell" | "buy"): string {
  const base =
    "rounded-lg border px-2 py-1 text-[10px] font-black uppercase tracking-wide transition";
  if (accent === "buy") {
    return `${base} border-cyan-300/40 bg-cyan-500/15 text-cyan-100 hover:border-cyan-200/60 hover:bg-cyan-500/25`;
  }
  return `${base} border-violet-300/40 bg-violet-500/15 text-violet-100 hover:border-violet-200/60 hover:bg-violet-500/25`;
}

function TokenRow({ token }: { token: PortfolioToken }) {
  const sellHref = buildPortfolioSwapSellHref(token.address);
  const buyHref = buildPortfolioSwapBuyHref(token.address);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/30 px-3 py-2.5">
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/10">
        {token.iconUrl ? (
          <Image src={token.iconUrl} alt="" width={36} height={36} className="h-9 w-9 object-cover" unoptimized />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs font-black text-cyan-200">
            {token.symbol.slice(0, 2)}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-bold text-white">{token.symbol}</p>
          <p className="shrink-0 text-sm font-black tabular-nums text-cyan-100">{formatUsd(token.valueUsd)}</p>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-xs text-slate-500">{token.name}</p>
          <p className="shrink-0 text-xs tabular-nums text-slate-400">{token.balanceFormatted}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex gap-1">
          <Link href={sellHref} className={actionBtnClass("sell")}>
            Sell
          </Link>
          <Link href={buyHref} className={actionBtnClass("buy")}>
            Buy
          </Link>
        </div>
        <a
          href={`https://basescan.org/token/${token.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] font-bold uppercase tracking-wide text-slate-500 hover:text-cyan-300"
        >
          Scan ↗
        </a>
      </div>
    </div>
  );
}

export function WalletPortfolioPanel() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const preferredConnector = useMemo(() => pickPreferredConnector(connectors), [connectors]);
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const [lookupInput, setLookupInput] = useState("");

  const lookupAddress = useMemo(() => {
    const trimmed = lookupInput.trim();
    if (trimmed && isAddress(trimmed)) return trimmed as `0x${string}`;
    return address;
  }, [lookupInput, address]);

  const isOnBase = chainId === base.id;

  const { data: liveEth } = useBalance({
    address: lookupAddress,
    chainId: base.id,
    query: { enabled: Boolean(lookupAddress && isConnected && isOnBase) },
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["portfolio", lookupAddress?.toLowerCase()],
    queryFn: async (): Promise<WalletPortfolioPayload> => {
      const res = await fetch(`/api/portfolio/${lookupAddress}`);
      const json = (await res.json()) as { ok: boolean; portfolio?: WalletPortfolioPayload; error?: string };
      if (!json.ok || !json.portfolio) throw new Error(json.error ?? "fetch_failed");
      return json.portfolio;
    },
    enabled: Boolean(lookupAddress),
    staleTime: 60_000,
  });

  const totalUsd = useMemo(() => {
    if (!data) return null;
    let sum = data.ethValueUsd ?? 0;
    for (const t of data.tokens) {
      if (t.valueUsd != null) sum += t.valueUsd;
    }
    const priced = (data.ethValueUsd != null ? 1 : 0) + data.tokens.filter((t) => t.valueUsd != null).length;
    return priced > 0 ? sum : null;
  }, [data]);

  const ethDisplay = liveEth
    ? formatEther(liveEth.value)
    : data?.ethBalanceFormatted ?? "0";

  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border border-cyan-300/25 bg-gradient-to-br from-cyan-500/10 via-slate-950/60 to-violet-500/10 p-6 md:p-8">
        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-cyan-200/90">You</p>
        <h2 className="mt-2 text-3xl font-black text-white">Base portfolio</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          ETH and ERC-20 balances on Base via Blockscout. Spam airdrops are filtered — verify unknown tokens before
          interacting.
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 md:p-6">
        {!isConnected ? (
          <div className="grid gap-3">
            <p className="text-sm text-slate-400">Connect to view your wallet, or paste any address below.</p>
            {preferredConnector ? (
              <button
                type="button"
                disabled={isConnecting}
                onClick={() => connect({ connector: preferredConnector })}
                className="w-fit rounded-xl bg-cyan-500/80 px-4 py-2 text-sm font-black text-white disabled:opacity-50"
              >
                {connectorButtonLabel(preferredConnector, isConnecting)}
              </button>
            ) : null}
          </div>
        ) : !isOnBase ? (
          <button
            type="button"
            disabled={isSwitching}
            onClick={() => switchChainAsync({ chainId: base.id })}
            className="rounded-xl border border-amber-300/40 bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-100"
          >
            {isSwitching ? "Switching…" : "Switch to Base"}
          </button>
        ) : address ? (
          <p className="text-sm text-slate-400">
            Wallet: <span className="font-mono font-bold text-cyan-200">{shortenAddressDisplay(address)}</span>
          </p>
        ) : null}

        <label className="mt-4 block">
          <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Address lookup</span>
          <input
            type="text"
            value={lookupInput}
            onChange={(e) => setLookupInput(e.target.value)}
            placeholder={address ?? "0x…"}
            className="mt-2 w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 font-mono text-sm text-white outline-none focus:border-cyan-300/50"
          />
        </label>
      </section>

      {lookupAddress && isLoading ? (
        <div className="animate-pulse space-y-3 rounded-3xl border border-white/10 bg-slate-950/40 p-6">
          <div className="h-16 rounded-2xl bg-white/5" />
          <div className="h-12 rounded-2xl bg-white/5" />
          <div className="h-12 rounded-2xl bg-white/5" />
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          Could not load portfolio.{" "}
          <button type="button" onClick={() => refetch()} className="font-bold underline">
            Retry
          </button>
        </div>
      ) : null}

      {data ? (
        <>
          <section className="rounded-3xl border border-cyan-300/30 bg-gradient-to-r from-cyan-500/12 to-violet-500/8 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Estimated total</p>
            <p className="mt-1 text-3xl font-black text-white">{formatUsd(totalUsd)}</p>
            <p className="mt-1 text-xs text-slate-500">
              {data.tokenCount} tokens · {data.hasMore ? "50+ indexed" : "full page"} · Blockscout
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
            <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-400">Native</h3>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/30 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white">ETH</p>
                <p className="text-xs text-slate-500">Base mainnet</p>
              </div>
              <div className="text-right">
                <p className="font-black tabular-nums text-cyan-100">{ethDisplay} ETH</p>
                <p className="text-xs tabular-nums text-slate-400">{formatUsd(data.ethValueUsd)}</p>
              </div>
              <Link
                href={buildSwapTabHref({ sell: "eth" })}
                className={`shrink-0 ${actionBtnClass("sell")}`}
              >
                Sell
              </Link>
            </div>
            {liveEth && data ? (
              <p className="mt-2 text-[10px] text-slate-600">
                On-chain wallet: {formatEther(liveEth.value)} ETH
              </p>
            ) : null}
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-400">ERC-20</h3>
              <button
                type="button"
                disabled={isFetching}
                onClick={() => refetch()}
                className="text-xs font-bold text-cyan-300 hover:underline disabled:opacity-50"
              >
                {isFetching ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            {data.tokens.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No ERC-20 tokens found (after spam filter).</p>
            ) : (
              <div className="mt-3 grid gap-2">
                {data.tokens.map((token) => (
                  <TokenRow key={token.address} token={token} />
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-wrap gap-2">
            <Link
              href={buildSwapTabHref()}
              className="rounded-xl border border-violet-300/35 px-4 py-2 text-sm font-bold text-violet-100"
            >
              Open swap
            </Link>
            <Link
              href={`/?tab=guard`}
              className="rounded-xl border border-amber-300/35 px-4 py-2 text-sm font-bold text-amber-100"
            >
              Review approvals
            </Link>
            {lookupAddress ? (
              <a
                href={`https://basescan.org/address/${lookupAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-slate-300"
              >
                BaseScan ↗
              </a>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
