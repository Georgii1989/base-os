"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatEther } from "viem";
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
    <div className="relative overflow-hidden rounded-[2rem] border border-white/16 bg-black/55 p-6 shadow-[0_0_80px_rgba(217,70,239,0.08),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl md:p-10">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-fuchsia-500/12 blur-[100px]" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-cyan-400/15 blur-[80px]" />

      <header className="relative flex flex-col gap-5 border-b border-white/10 pb-8 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-200/90">
              Summary
            </span>
            <span className="rounded-full border border-white/14 bg-white/5 px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-300">
              Base
            </span>
          </div>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Address
              </p>
              <p className="mt-2 break-all font-mono text-lg font-bold tracking-tight text-white md:text-2xl">
                {data.checksum}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void copy()}
              className="shrink-0 rounded-2xl border border-white/14 bg-white/5 px-4 py-2.5 text-sm font-black text-white transition hover:border-cyan-400/55 hover:bg-cyan-400/15"
            >
              {copied ? "Copied" : "Copy address"}
            </button>
          </div>
        </div>
      </header>

      <section className="relative mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Type"
          value={data.isContract ? "Smart contract" : "Wallet"}
          hint={data.isContract ? "Has code on-chain" : "Typical user wallet"}
          accent="fuchsia"
        />
        <StatCard
          label="ETH balance"
          value={`${deBankStyle}`}
          hint="on Base"
          accent="cyan"
        />
        <StatCard
          label="Transactions sent"
          value={data.txCount.toLocaleString()}
          hint="from this address"
          accent="violet"
        />
      </section>

      <section className="relative mt-8 rounded-3xl border border-white/12 bg-black/35 p-5 md:flex md:items-center md:justify-between md:gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
            Code size
          </p>
          <p className="mt-3 text-xl font-black text-white">
            {data.isContract ? `${data.bytecodeBytes.toLocaleString()} bytes` : "— none —"}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {data.isContract
              ? "Contracts have public code you can inspect in the explorer."
              : "Wallets usually have no code at their address."}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 md:mt-0 md:justify-end">
          <a
            href={basescan}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center justify-center rounded-2xl border border-cyan-300/55 bg-gradient-to-br from-cyan-500/25 via-cyan-500/10 to-transparent px-4 py-2.5 text-sm font-black text-cyan-50 shadow-[0_0_26px_rgba(34,211,238,0.15)] hover:border-cyan-200"
          >
            Open Basescan ↗
          </a>
          <a
            href={REVOKE}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center justify-center rounded-2xl border border-white/16 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-100 hover:border-white/30"
          >
            Token permissions ↗
          </a>
          <Link
            href={`/?tab=guard`}
            className="inline-flex items-center justify-center rounded-2xl border border-fuchsia-300/35 bg-fuchsia-500/15 px-4 py-2.5 text-sm font-black text-fuchsia-50 hover:bg-fuchsia-500/25"
          >
            Guard in Base OS
          </Link>
          <button
            type="button"
            onClick={() => {
              const next = toggleWatchlistAddress(data.checksum);
              setSignalsPinned(next);
            }}
            className="inline-flex items-center justify-center rounded-2xl border border-emerald-300/45 bg-emerald-500/10 px-4 py-2.5 text-sm font-black uppercase tracking-[0.08em] text-emerald-100 hover:border-emerald-200 hover:bg-emerald-500/20"
          >
            {signalsPinned ? "Remove from tracker" : "Save to tracker"}
          </button>
          <Link
            href={`/${data.checksum}`}
            className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-transparent px-4 py-2.5 text-sm font-bold text-slate-200 hover:border-white/25"
          >
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

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent: "cyan" | "fuchsia" | "violet";
}) {
  const ring =
    accent === "cyan"
      ? "from-cyan-400/35 to-transparent shadow-[inset_0_0_0_1px_rgba(34,211,238,0.18)]"
      : accent === "fuchsia"
        ? "from-fuchsia-400/35 to-transparent shadow-[inset_0_0_0_1px_rgba(217,70,239,0.16)]"
        : "from-violet-400/35 to-transparent shadow-[inset_0_0_0_1px_rgba(139,92,246,0.14)]";

  return (
    <div className={`rounded-3xl border border-white/10 bg-gradient-to-b ${ring} via-black/55 to-black/65 p-4`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-500">{label}</p>
      <p className="mt-4 text-xl font-black text-white md:text-[1.35rem]">{value}</p>
      <p className="mt-2 text-[12px] text-slate-500">{hint}</p>
    </div>
  );
}
