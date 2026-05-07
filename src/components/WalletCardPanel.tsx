"use client";

import Link from "next/link";
import { useAccount, useDisconnect } from "wagmi";

export function WalletCardPanel() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  if (!isConnected || !address) {
    return (
      <div className="rounded-3xl border border-white/15 bg-slate-950/55 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-200/80">Identity</p>
        <h2 className="mt-2 text-3xl font-black text-white">Wallet Card</h2>
        <p className="mt-3 max-w-xl text-sm text-slate-200/85">
          Connect from the Tip module (or Guard) first. Here you&apos;ll see your Base address with quick links —
          Tip profile stats, explorers, copy.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <div className="rounded-3xl border border-cyan-300/25 bg-slate-950/55 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-200/90">Wallet</p>
        <h2 className="mt-2 text-3xl font-black text-white">Your card</h2>
        <p className="mt-3 break-all font-mono text-sm font-bold text-cyan-100">{address}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/${address}`}
            className="rounded-xl border border-fuchsia-300/35 bg-fuchsia-500/15 px-4 py-2 text-sm font-bold text-fuchsia-100"
          >
            Tip profile
          </Link>
          <a
            href={`https://basescan.org/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-slate-100"
          >
            BaseScan
          </a>
          <button
            type="button"
            onClick={() => void navigator.clipboard.writeText(address)}
            className="rounded-xl border border-emerald-300/35 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-100"
          >
            Copy address
          </button>
        </div>
      </div>
      <div className="rounded-3xl border border-white/15 bg-white/5 p-5">
        <p className="text-sm text-slate-200/90">
          Disconnect only affects this browser session inside Base OS utilities.
        </p>
        <button
          type="button"
          onClick={() => disconnect()}
          className="mt-4 w-full rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-2 text-sm font-bold text-rose-100"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
