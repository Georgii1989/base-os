"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseAbiItem, zeroAddress } from "viem";
import { useAccount, usePublicClient } from "wagmi";

type HolderRecord = {
  address: `0x${string}`;
  mintTxHash: `0x${string}`;
  blockNumber: bigint;
};

/** Max blocks per `getLogs` request — keeps public RPCs happier on long ranges. */
const CHUNK_SIZE = BigInt(2500);
const DEFAULT_CSV_OWNER = "0x8655520b4b19187038ac9a4f560da0979cc1e95c";

function registryCsvOwnerLower(): string {
  const raw = process.env.NEXT_PUBLIC_REGISTRY_CSV_OWNER?.trim().toLowerCase();
  if (raw && /^0x[a-f0-9]{40}$/.test(raw)) return raw;
  return DEFAULT_CSV_OWNER.toLowerCase();
}

export function SoulboundHoldersList() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const sbtAddress = process.env.NEXT_PUBLIC_SBT_ADDRESS as `0x${string}` | undefined;
  const deployBlockEnv = process.env.NEXT_PUBLIC_SBT_FROM_BLOCK;

  const [holders, setHolders] = useState<Map<string, HolderRecord>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [historyHint, setHistoryHint] = useState<string | null>(null);
  const [registryExpanded, setRegistryExpanded] = useState(true);
  const lastScannedRef = useRef<bigint | null>(null);
  const initialScanDoneRef = useRef(false);

  const transferEvent = useMemo(
    () => parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"),
    []
  );

  useEffect(() => {
    if (!publicClient || !sbtAddress) return;

    let cancelled = false;

    async function scanRange(fromBlock: bigint, toBlock: bigint) {
      const collected: HolderRecord[] = [];
      let start = fromBlock;
      while (start <= toBlock) {
        const end =
          start + CHUNK_SIZE - BigInt(1) > toBlock ? toBlock : start + CHUNK_SIZE - BigInt(1);
        const logs = await publicClient.getLogs({
          address: sbtAddress,
          event: transferEvent,
          args: { from: zeroAddress },
          fromBlock: start,
          toBlock: end,
        });
        for (const log of logs) {
          const { to } = log.args as { to?: `0x${string}` };
          const txHash = log.transactionHash;
          const blockNumber = log.blockNumber;
          if (to && txHash && blockNumber !== null && blockNumber !== undefined) {
            collected.push({
              address: to,
              mintTxHash: txHash,
              blockNumber,
            });
          }
        }
        start = end + BigInt(1);
      }
      return collected;
    }

    async function tick() {
      try {
        const latest = await publicClient.getBlockNumber();
        const deployBlock = deployBlockEnv ? BigInt(deployBlockEnv) : null;

        if (!initialScanDoneRef.current) {
          const fromBlock =
            deployBlock ??
            (latest > BigInt(5000) ? latest - BigInt(5000) : BigInt(0));
          const records = await scanRange(fromBlock, latest);
          if (cancelled) return;

          setHolders((prev) => {
            const next = new Map(prev);
            for (const r of records) {
              const key = r.address.toLowerCase();
              if (!next.has(key)) next.set(key, r);
            }
            return next;
          });
          lastScannedRef.current = latest;
          initialScanDoneRef.current = true;
          setHistoryHint(
            deployBlock
              ? null
              : "Showing mints from the last ~5k blocks only. Set NEXT_PUBLIC_SBT_FROM_BLOCK to the contract deployment block for a complete registry."
          );
          setError(null);
          return;
        }

        const fromBlock =
          lastScannedRef.current !== null
            ? lastScannedRef.current + BigInt(1)
            : latest;
        if (fromBlock > latest) return;

        const records = await scanRange(fromBlock, latest);
        if (cancelled) return;

        if (records.length > 0) {
          setHolders((prev) => {
            const next = new Map(prev);
            for (const r of records) {
              const key = r.address.toLowerCase();
              if (!next.has(key)) next.set(key, r);
            }
            return next;
          });
        }
        lastScannedRef.current = latest;
        setError(null);
      } catch {
        if (!cancelled) {
          setError("Couldn’t load badge holders. Try again later.");
        }
      }
    }

    void tick();
    const id = setInterval(() => {
      void tick();
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [publicClient, sbtAddress, deployBlockEnv, transferEvent]);

  const sortedHolders = useMemo(() => {
    return Array.from(holders.values()).sort((a, b) => {
      if (a.blockNumber === b.blockNumber) return a.address.localeCompare(b.address);
      return a.blockNumber > b.blockNumber ? -1 : 1;
    });
  }, [holders]);

  const isOwner = address ? address.toLowerCase() === registryCsvOwnerLower() : false;

  function downloadCsv() {
    const header = "address,mint_tx_hash,block_number";
    const lines = sortedHolders.map(
      (h) => `${h.address},${h.mintTxHash},${h.blockNumber.toString()}`
    );
    const blob = new Blob([`${header}\n${lines.join("\n")}\n`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "base-supporter-soulbound-holders.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyAddresses() {
    const text = sortedHolders.map((h) => h.address).join("\n");
    await navigator.clipboard.writeText(text);
  }

  if (!sbtAddress) {
    return (
      <div className="mt-4 grid gap-3 rounded-2xl border border-violet-300/30 bg-slate-950/50 p-4">
        <h2 className="text-xl font-black text-violet-200">Badge holders</h2>
        <p className="text-sm text-violet-100/90">Badge list isn’t turned on in this build.</p>
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3 rounded-2xl border border-violet-300/30 bg-slate-950/50 p-4">
      <button
        type="button"
        onClick={() => setRegistryExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-violet-200/30 bg-violet-500/10 px-3 py-2 text-left"
      >
        <div>
          <h2 className="text-xl font-black text-violet-200">Badge holders</h2>
          <p className="mt-1 text-sm text-violet-100/90">
            <span className="font-mono text-xs text-violet-300">{sbtAddress}</span>
          </p>
        </div>
        <span className="text-lg font-black text-violet-200">{registryExpanded ? "▲" : "▼"}</span>
      </button>

      {registryExpanded ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-sm text-violet-100/90">For thanking or contacting supporters.</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void copyAddresses()}
                disabled={sortedHolders.length === 0}
                className="rounded-lg border border-violet-200/40 bg-violet-500/20 px-3 py-1.5 text-xs font-bold text-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Copy addresses
              </button>
              <button
                type="button"
                onClick={downloadCsv}
                disabled={!isOwner || sortedHolders.length === 0}
                className="rounded-lg border border-fuchsia-200/40 bg-fuchsia-500/20 px-3 py-1.5 text-xs font-bold text-fuchsia-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Download CSV
              </button>
            </div>
          </div>
          {!isOwner ? (
            <p className="text-xs text-amber-200/95">
              CSV download only works when your connected wallet is the owner set in app config.
            </p>
          ) : null}

          {historyHint ? <p className="text-sm text-amber-200/95">{historyHint}</p> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <p className="text-sm text-violet-100/90">
            Wallets: <span className="font-bold text-violet-100">{sortedHolders.length}</span>
          </p>

          {sortedHolders.length === 0 ? (
            <p className="text-sm text-violet-100/90">No badge mints in the range we checked.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-xl border border-violet-200/20 bg-violet-950/20">
              <ul className="divide-y divide-violet-200/10">
                {sortedHolders.map((h) => (
                  <li key={h.address} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-mono text-xs font-bold text-cyan-300">{h.address}</span>
                      <span className="text-xs text-violet-200/80">
                        block {h.blockNumber.toString()}
                      </span>
                    </div>
                    <a
                      href={`https://basescan.org/tx/${h.mintTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-xs font-bold text-violet-300 underline"
                    >
                      Mint tx
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
