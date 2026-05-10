"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatEther, isAddress } from "viem";
import { base } from "wagmi/chains";
import { useAccount, usePublicClient } from "wagmi";
import {
  addToWatchlist,
  loadWatchlist,
  removeFromWatchlist,
  BASE_OS_WATCHLIST_EVENT,
  watchlistCapacity,
} from "@/lib/watchlistStorage";

export type WatchSnapshot = {
  address: `0x${string}`;
  balanceWei: bigint;
  txCount: number;
  isContract: boolean;
};

export type WatchTxExtraStats = {
  deployments: number;
  uniqueSendTargets: number;
  txsAnalyzed: number;
  capped: boolean;
  source: "ok" | "error";
};

async function snapshotOne(
  client: {
    getBalance: (opts: { address: `0x${string}` }) => Promise<bigint>;
    getTransactionCount: (opts: { address: `0x${string}` }) => Promise<number>;
    getBytecode: (opts: { address: `0x${string}` }) => Promise<`0x${string}` | undefined>;
  },
  address: `0x${string}`
): Promise<WatchSnapshot> {
  const [balance, txCount, bytecode] = await Promise.all([
    client.getBalance({ address }),
    client.getTransactionCount({ address }),
    client.getBytecode({ address }),
  ]);
  const code = bytecode ?? "0x";
  const isContract = code !== "0x" && code.length > 2;
  return { address, balanceWei: balance, txCount, isContract };
}

function computeDeltaMap(prev: WatchSnapshot[] | null, next: WatchSnapshot[]) {
  const out = new Map<string, { balanceWeiDelta: bigint; nonceDelta: number }>();
  if (!prev || next.length === 0) return out;
  const prevMap = new Map(prev.map((s) => [s.address.toLowerCase(), s]));
  for (const snap of next) {
    const k = snap.address.toLowerCase();
    const row = prevMap.get(k);
    if (!row) continue;
    out.set(k, {
      balanceWeiDelta: snap.balanceWei - row.balanceWei,
      nonceDelta: snap.txCount - row.txCount,
    });
  }
  return out;
}

export function WatchlistPanel() {
  const publicClient = usePublicClient({ chainId: base.id });
  const queryClient = useQueryClient();
  const { address: connected } = useAccount();
  const [list, setList] = useState<`0x${string}`[]>(() => loadWatchlist());

  const syncFromStorage = useCallback(() => {
    setList(loadWatchlist());
  }, []);

  useEffect(() => {
    function onSync() {
      setList(loadWatchlist());
    }
    window.addEventListener(BASE_OS_WATCHLIST_EVENT, onSync);
    return () => window.removeEventListener(BASE_OS_WATCHLIST_EVENT, onSync);
  }, []);

  const listKey = useMemo(() => list.join(","), [list]);

  const {
    data: snapshots = [],
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["watchlist-snapshots", listKey],
    enabled: Boolean(publicClient && list.length > 0),
    queryFn: async () => {
      if (!publicClient) return [];
      return Promise.all(list.map((addr) => snapshotOne(publicClient, addr)));
    },
    staleTime: 45_000,
    refetchInterval: 120_000,
  });

  const { data: txExtra, isFetching: txExtraFetching, isError: txExtraError, refetch: refetchTxExtra } = useQuery({
    queryKey: ["watchlist-tx-stats", listKey],
    enabled: list.length > 0,
    queryFn: async () => {
      const response = await fetch("/api/watchlist-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: list }),
      });
      if (!response.ok) throw new Error("watchlist-stats");
      return (await response.json()) as
        | { ok: false; reason: "missing_api_key"; byAddress: Record<string, never> }
        | { ok: true; byAddress: Record<string, WatchTxExtraStats> };
    },
    staleTime: 120_000,
    refetchInterval: 300_000,
  });

  const txStatsByAddress = useMemo(() => {
    const m = new Map<string, WatchTxExtraStats>();
    if (!txExtra || !("ok" in txExtra) || !txExtra.ok) return m;
    for (const [k, v] of Object.entries(txExtra.byAddress)) {
      m.set(k.toLowerCase(), v);
    }
    return m;
  }, [txExtra]);

  const basescanHint =
    txExtra && "ok" in txExtra && txExtra.ok === false && txExtra.reason === "missing_api_key"
      ? "Deployments & send targets load from Basescan. Add BASESCAN_API_KEY (or ETHERSCAN_API_KEY) in Vercel / .env.local, then redeploy."
      : null;

  const prevSnapshotsRef = useRef<WatchSnapshot[] | null>(null);
  const [deltaByAddress, setDeltaByAddress] = useState(
    () => new Map<string, { balanceWeiDelta: bigint; nonceDelta: number }>()
  );

  useEffect(() => {
    queueMicrotask(() => {
      if (snapshots.length === 0) {
        prevSnapshotsRef.current = null;
        setDeltaByAddress(new Map());
        return;
      }
      const prev = prevSnapshotsRef.current;
      if (!prev) {
        setDeltaByAddress(new Map());
        prevSnapshotsRef.current = snapshots;
        return;
      }
      setDeltaByAddress(computeDeltaMap(prev, snapshots));
      prevSnapshotsRef.current = snapshots;
    });
  }, [snapshots]);

  const snapByAddress = useMemo(() => {
    const m = new Map<string, WatchSnapshot>();
    for (const row of snapshots) {
      m.set(row.address.toLowerCase(), row);
    }
    return m;
  }, [snapshots]);

  const [rawInput, setRawInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  function handleAdd(trimmed?: string) {
    const raw = (trimmed ?? rawInput).trim();
    const ok = addToWatchlist(raw);
    if (!ok) {
      const t = raw.trim();
      if (!isAddress(t)) setInputError("That doesn’t look like a valid address.");
      else if (loadWatchlist().length >= watchlistCapacity) {
        setInputError(`You can save up to ${watchlistCapacity} addresses. Remove one to add more.`);
      } else setInputError("Already in your list.");
      return;
    }
    setRawInput("");
    setInputError(null);
    syncFromStorage();
    void queryClient.invalidateQueries({ queryKey: ["watchlist-snapshots"] });
    void queryClient.invalidateQueries({ queryKey: ["watchlist-tx-stats"] });
  }

  function handleRemove(addr: `0x${string}`) {
    removeFromWatchlist(addr);
    syncFromStorage();
    void queryClient.invalidateQueries({ queryKey: ["watchlist-snapshots"] });
    void queryClient.invalidateQueries({ queryKey: ["watchlist-tx-stats"] });
  }

  return (
    <div className="grid gap-6">
      <div className="relative overflow-hidden rounded-[1.75rem] border border-emerald-300/35 bg-gradient-to-br from-emerald-500/14 via-black/65 to-purple-950/40 p-6 md:p-8">
        <div className="pointer-events-none absolute right-[-8%] top-[-28%] h-52 w-52 rounded-full bg-cyan-400/12 blur-[70px]" />
        <header className="relative max-w-3xl">
          <p className="text-[11px] font-black uppercase tracking-[0.38em] text-emerald-200/90">
            Saved only on this device
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
            Tracked wallets
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-300 md:text-base">
            Add addresses you care about. Balance and transaction count come from the public Base RPC.
            With <code className="font-mono text-slate-400">BASESCAN_API_KEY</code>
            {""} / <code className="font-mono text-slate-400">ETHERSCAN_API_KEY</code>
            {""} on the host we aggregate your{" "}
            <span className="font-semibold text-slate-200">outgoing</span> txs from Basescan: deployments (empty{" "}
            <code className="font-mono text-slate-500">to</code>) and unique recipients.
            {""} Contracts deployed via factories only count when your wallet is the outer sender with an empty{" "}
            <code className="font-mono text-slate-500">to</code> — not internal creates.
            {""} Your pin list stays only in this browser.
          </p>
        </header>
      </div>

      <section className="rounded-3xl border border-white/12 bg-black/45 p-5 backdrop-blur-sm md:flex md:flex-wrap md:items-end md:gap-4 md:p-6">
        <div className="min-w-[min(100%,380px)] flex-1">
          <label className="block text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
            Base address (0x…)
          </label>
          <input
            value={rawInput}
            spellCheck={false}
            placeholder="0x…"
            onChange={(e) => {
              setRawInput(e.target.value);
              setInputError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            className="mt-2 w-full rounded-2xl border border-white/12 bg-black/55 px-4 py-3 font-mono text-sm text-white outline-none ring-cyan-500/0 transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/25"
          />
          {inputError ? <p className="mt-2 text-sm font-semibold text-amber-200">{inputError}</p> : null}
        </div>
        <button
          type="button"
          onClick={() => handleAdd()}
          className="mt-4 h-[46px] w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 px-6 text-sm font-black uppercase tracking-[0.15em] text-white shadow-[0_14px_40px_rgba(16,185,129,0.25)] transition hover:brightness-110 md:mt-[22px] md:w-auto md:min-w-[140px]"
        >
          Pin
        </button>
        {connected ? (
          <button
            type="button"
            onClick={() => handleAdd(connected)}
            className="mt-2 w-full rounded-2xl border border-white/16 bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-200 hover:border-emerald-300/55 hover:bg-emerald-500/15 md:mt-[22px] md:w-auto"
          >
            Pin connected wallet
          </button>
        ) : null}
        <button
          type="button"
          disabled={list.length === 0 || !publicClient || isFetching || txExtraFetching}
          onClick={() => {
            void refetch();
            void refetchTxExtra();
          }}
          className="mt-2 w-full rounded-2xl border border-cyan-300/55 bg-transparent px-4 py-2.5 text-sm font-black uppercase tracking-[0.12em] text-cyan-100 hover:bg-cyan-500/15 disabled:pointer-events-none disabled:opacity-40 md:mt-[22px] md:w-auto md:min-w-[160px]"
        >
          {isFetching || txExtraFetching ? "Refreshing…" : "Refresh now"}
        </button>
      </section>

      {list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/15 bg-slate-950/40 px-8 py-20 text-center">
          <p className="text-lg font-black text-slate-300">Nothing here yet</p>
          <p className="mt-3 text-sm text-slate-500">Add an address above to start tracking.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/safety"
              className="rounded-2xl border border-teal-300/55 bg-teal-500/10 px-4 py-2 text-sm font-bold text-teal-100"
            >
              Address lookup
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-400">
              {list.length} saved · auto-refresh about every 2 min
              {dataUpdatedAt > 0 ? (
                <>
                  {" "}
                  · last refresh{" "}
                  <time dateTime={new Date(dataUpdatedAt).toISOString()} suppressHydrationWarning>
                    {new Date(dataUpdatedAt).toLocaleString()}
                  </time>
                </>
              ) : null}
              {txExtraFetching ? " · loading on-chain extras…" : null}
            </p>
            {basescanHint ? <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500">{basescanHint}</p> : null}
            {txExtraError ? (
              <p className="mt-2 text-xs text-amber-200/90">Could not load deploy / send-target stats. Try again later.</p>
            ) : null}
          </div>
          <div className="grid gap-3">
            {list.map((addr) => {
              const key = addr.toLowerCase();
              const snap = snapByAddress.get(key);
              const delta = deltaByAddress.get(key);
              const extra = txStatsByAddress.get(key);
              const missingKey =
                txExtra !== undefined &&
                "ok" in txExtra &&
                txExtra.ok === false &&
                txExtra.reason === "missing_api_key";
              const bal =
                snap !== undefined ? formatEtherSnap(snap.balanceWei) : publicClient ? "…" : "—";
              const deltaLine =
                snap !== undefined && delta !== undefined
                  ? summarizeDelta(delta.balanceWeiDelta, delta.nonceDelta)
                  : null;

              let deployStr = "—";
              let targetsStr = "—";
              let capNote: string | null = null;
              if (!missingKey && txExtra && "ok" in txExtra && txExtra.ok) {
                if (txExtraFetching && !extra) {
                  deployStr = "…";
                  targetsStr = "…";
                } else if (extra?.source === "ok") {
                  deployStr = extra.deployments.toLocaleString();
                  targetsStr = extra.uniqueSendTargets.toLocaleString();

                  if (extra.txsAnalyzed === 0 && snap !== undefined && snap.txCount > 0) {
                    capNote =
                      "No outgoing txs in the Basescan slice we pulled (mixed with incoming) — try again later or we need a higher scan limit.";
                  }
                  if (extra.capped) {
                    const tail = `Fetched up to ~25k txs involving this address (incoming+outgoing mixed); stats use only your sends (${extra.txsAnalyzed.toLocaleString()} in that window).`;
                    capNote = capNote ? `${capNote} ${tail}` : tail;
                  }
                } else if (extra?.source === "error") {
                  deployStr = "—";
                  targetsStr = "—";
                }
              }

              return (
                <article
                  key={addr}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 px-5 py-5 transition hover:border-cyan-300/55 hover:bg-white/[0.04] md:px-6"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/14 bg-black/55 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                          {snap ? (snap.isContract ? "Contract" : "Wallet") : "⋯"}
                        </span>
                      </div>
                      <p className="mt-3 break-all font-mono text-sm font-bold tracking-tight text-white md:text-base">
                        {addr}
                      </p>
                      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            Balance
                          </dt>
                          <dd className="mt-1 font-mono font-semibold text-cyan-100">{bal}&nbsp;ETH</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            Tx count
                            <span className="ml-1 font-normal normal-case text-slate-600">(nonce)</span>
                          </dt>
                          <dd className="mt-1 font-mono font-semibold text-white">
                            {snap !== undefined ? snap.txCount.toLocaleString() : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            Deployments
                            <span className="ml-1 block pt-0.5 font-normal normal-case text-[10px] text-slate-600">
                              contracts created
                            </span>
                          </dt>
                          <dd className="mt-1 font-mono font-semibold text-fuchsia-200">{deployStr}</dd>
                        </div>
                        <div>
                          <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            Send targets
                            <span className="ml-1 block pt-0.5 font-normal normal-case text-[10px] text-slate-600">
                              unique outgoing “to” addresses
                            </span>
                          </dt>
                          <dd className="mt-1 font-mono font-semibold text-violet-200">{targetsStr}</dd>
                        </div>
                      </dl>
                      {extra?.source === "error" && !missingKey && !txExtraFetching ? (
                        <p className="mt-2 text-[11px] text-amber-200/90">
                          Basescan did not return stats (check the key, plan limits, or try later).
                        </p>
                      ) : null}
                      {capNote ? <p className="mt-3 text-[11px] text-slate-500">{capNote}</p> : null}
                      {snap !== undefined && delta !== undefined ? (
                        <p className="mt-4 text-[12px] font-medium leading-relaxed text-slate-400">
                          since last refresh:{" "}
                          {deltaLine === "steady" ? (
                            <span className="text-slate-500">balance and activity unchanged</span>
                          ) : (
                            <span className="text-emerald-200/95">{deltaLine}</span>
                          )}
                        </p>
                      ) : snap !== undefined ? (
                        <p className="mt-4 text-[12px] text-slate-500">
                          First load — compare text appears after the next refresh.
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-shrink-0 flex-wrap gap-2 lg:flex-col xl:flex-row xl:justify-end">
                      <Link
                        href={`/safety/${addr}`}
                        className="inline-flex items-center justify-center rounded-2xl border border-teal-300/65 bg-teal-500/15 px-4 py-2 text-xs font-black uppercase tracking-[0.1em] text-teal-100 hover:bg-teal-500/25"
                      >
                        Open profile
                      </Link>
                      <a
                        href={`https://basescan.org/address/${addr}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center justify-center rounded-2xl border border-white/12 bg-transparent px-4 py-2 text-xs font-bold text-slate-200 hover:border-white/25"
                      >
                        Scan ↗
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemove(addr)}
                        className="inline-flex rounded-2xl border border-rose-400/55 bg-transparent px-4 py-2 text-xs font-black uppercase tracking-[0.1em] text-rose-300 hover:bg-rose-500/25"
                      >
                        Unpin address
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatEtherSnap(wei: bigint) {
  const s = formatEther(wei);
  const [whole, frac] = s.split(".");
  const fr = frac ? frac.slice(0, 8) : "";
  return fr ? `${whole}.${fr}` : whole;
}

function formatDeltaClause(balanceWeiDelta: bigint, nonceDelta: number): string {
  const balPart =
    balanceWeiDelta === BigInt(0)
      ? "balance ±0 ETH"
      : `balance ${formatSignedEtherTip(balanceWeiDelta)} ETH`;
  const noncePart =
    nonceDelta === 0 ? "tx count ±0" : `tx count ${nonceDelta > 0 ? "+" : ""}${nonceDelta.toLocaleString()}`;
  return `${balPart} · ${noncePart}`;
}

function summarizeDelta(balanceWeiDelta: bigint, nonceDelta: number): "steady" | string {
  if (balanceWeiDelta === BigInt(0) && nonceDelta === 0) return "steady";
  return formatDeltaClause(balanceWeiDelta, nonceDelta);
}

function formatSignedEtherTip(wei: bigint): string {
  const neg = wei < BigInt(0);
  const abs = neg ? -wei : wei;
  const s = formatEtherSnap(abs);
  return `${neg ? "−" : "+"}${s}`;
}
