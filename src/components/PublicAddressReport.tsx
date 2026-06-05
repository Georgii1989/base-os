"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
import { OsAddressDisplay } from "@/components/os/OsAddressDisplay";
import { OsMetricTile } from "@/components/os/OsChrome";
import { BASE_OS_WATCHLIST_EVENT, isWatched, toggleWatchlistAddress } from "@/lib/watchlistStorage";

export type PublicSafetyPayload = {
  checksum: string;
  isContract: boolean;
  bytecodeBytes: number;
  balanceWei: string;
  txCount: number;
};

const REVOKE = "https://revoke.cash/chain/8453";

export function PublicAddressReport({ data }: { data: PublicSafetyPayload }) {
  const [copied, setCopied] = useState(false);
  const [signalsPinned, setSignalsPinned] = useState(false);
  const balanceEth = formatEther(BigInt(data.balanceWei));

  useEffect(() => {
    function sync() {
      setSignalsPinned(isWatched(data.checksum));
    }
    sync();
    window.addEventListener(BASE_OS_WATCHLIST_EVENT, sync);
    return () => window.removeEventListener(BASE_OS_WATCHLIST_EVENT, sync);
  }, [data.checksum]);

  async function copy() {
    await navigator.clipboard.writeText(data.checksum);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const basescan = `https://basescan.org/address/${data.checksum}`;
  const deBankStyle = balanceEth.includes(".")
    ? `${balanceEth.split(".")[0]}.${balanceEth.split(".")[1]?.slice(0, 8) ?? ""}`
    : balanceEth;

  return (
    <div className="os-panel relative overflow-hidden p-6 md:p-10">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-amber-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-violet-500/12 blur-[80px]" />

      <header className="relative flex flex-col gap-5 border-b border-white/10 pb-8 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200/90">
              Summary
            </span>
            <span className="rounded-full border border-white/14 bg-white/5 px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-300">
              Base
            </span>
          </div>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="os-eyebrow text-[11px]">Address</p>
              <div className="mt-2">
                <OsAddressDisplay
                  address={data.checksum as `0x${string}`}
                  showChecksum
                  monoClassName="break-all font-mono text-lg font-bold tracking-tight text-white md:text-2xl"
                />
              </div>
            </div>
            <button type="button" onClick={() => void copy()} className="os-cta-ghost shrink-0 px-4 py-2.5 text-sm">
              {copied ? "Copied" : "Copy address"}
            </button>
          </div>
        </div>
      </header>

      <section className="relative mt-8 grid gap-4 sm:grid-cols-3">
        <OsMetricTile
          label="Type"
          value={data.isContract ? "Smart contract" : "Wallet"}
          hint={data.isContract ? "Has code on-chain" : "Typical user wallet"}
          accent="violet"
        />
        <OsMetricTile label="ETH balance" value={deBankStyle} hint="on Base" accent="gold" />
        <OsMetricTile
          label="Transactions sent"
          value={data.txCount.toLocaleString()}
          hint="from this address"
          accent="amber"
        />
      </section>

      <section className="os-panel relative mt-8 p-5 md:flex md:items-center md:justify-between md:gap-6">
        <div>
          <p className="os-eyebrow text-[11px]">Code size</p>
          <p className="mt-3 text-xl font-bold text-white">
            {data.isContract ? `${data.bytecodeBytes.toLocaleString()} bytes` : "— none —"}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {data.isContract
              ? "Contracts have public code you can inspect in the explorer."
              : "Wallets usually have no code at their address."}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 md:mt-0 md:justify-end">
          <a href={basescan} target="_blank" rel="noreferrer noopener" className="os-cta px-4 py-2.5 text-sm">
            Open Basescan ↗
          </a>
          <a
            href={REVOKE}
            target="_blank"
            rel="noreferrer noopener"
            className="os-cta-ghost px-4 py-2.5 text-sm"
          >
            Token permissions ↗
          </a>
          <Link href={`/?tab=guard`} className="os-cta-ghost px-4 py-2.5 text-sm">
            Guard in Base OS
          </Link>
          <button
            type="button"
            onClick={() => {
              const next = toggleWatchlistAddress(data.checksum);
              setSignalsPinned(next);
            }}
            className="os-cta-ghost px-4 py-2.5 text-sm uppercase tracking-[0.08em] text-emerald-100"
          >
            {signalsPinned ? "Remove from tracker" : "Save to tracker"}
          </button>
          <Link href={`/${data.checksum}`} className="os-cta-ghost px-4 py-2.5 text-sm">
            Tips for this address →
          </Link>
        </div>
      </section>

      <footer className="relative mt-8 border-t border-white/10 pt-6 text-[13px] leading-relaxed text-slate-400">
        <strong className="text-slate-200">Note:</strong> this page reads public data only. It isn’t financial or security
        advice — always double-check before you send money.
      </footer>
    </div>
  );
}
