"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

type HolderRecord = {
  address: `0x${string}`;
  tokenId: string;
  mintTxHash: `0x${string}` | null;
  blockNumber: string | null;
};

const DEFAULT_CSV_OWNER = "0x8655520b4b19187038ac9a4f560da0979cc1e95c";

function registryCsvOwnerLower(): string {
  const raw = process.env.NEXT_PUBLIC_REGISTRY_CSV_OWNER?.trim().toLowerCase();
  if (raw && /^0x[a-f0-9]{40}$/.test(raw)) return raw;
  return DEFAULT_CSV_OWNER.toLowerCase();
}

export function SoulboundHoldersList() {
  const { address } = useAccount();
  const sbtAddress = process.env.NEXT_PUBLIC_SBT_ADDRESS as `0x${string}` | undefined;

  const [holders, setHolders] = useState<HolderRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [registryExpanded, setRegistryExpanded] = useState(true);

  const loadHolders = useCallback(async () => {
    try {
      const res = await fetch("/api/badge-holders");
      const json = (await res.json()) as {
        ok?: boolean;
        holders?: HolderRecord[];
        error?: string;
      };
      if (!res.ok || !json.ok || !json.holders) {
        throw new Error(json.error ?? "fetch_failed");
      }
      setHolders(json.holders);
      setError(null);
    } catch {
      setError("Couldn't load badge holders. Try again later.");
    }
  }, []);

  useEffect(() => {
    if (!sbtAddress) return;

    void loadHolders();
    const id = setInterval(() => {
      void loadHolders();
    }, 30_000);

    return () => clearInterval(id);
  }, [loadHolders, sbtAddress]);

  const sortedHolders = useMemo(() => holders, [holders]);

  const isOwner = address ? address.toLowerCase() === registryCsvOwnerLower() : false;

  function downloadCsv() {
    const header = "address,token_id,mint_tx_hash,block_number";
    const lines = sortedHolders.map(
      (h) =>
        `${h.address},${h.tokenId},${h.mintTxHash ?? ""},${h.blockNumber ?? ""}`
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
        <p className="text-sm text-violet-100/90">Badge list isn't turned on in this build.</p>
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

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <p className="text-sm text-violet-100/90">
            Wallets: <span className="font-bold text-violet-100">{sortedHolders.length}</span>
          </p>

          {sortedHolders.length === 0 && !error ? (
            <p className="text-sm text-violet-100/90">No badge mints found yet.</p>
          ) : null}

          {sortedHolders.length > 0 ? (
            <div className="max-h-72 overflow-y-auto rounded-xl border border-violet-200/20 bg-violet-950/20">
              <ul className="divide-y divide-violet-200/10">
                {sortedHolders.map((h) => (
                  <li
                    key={`${h.address}-${h.tokenId}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-mono text-xs font-bold text-cyan-300">{h.address}</span>
                      <span className="text-xs text-violet-200/80">token #{h.tokenId}</span>
                    </div>
                    <a
                      href={
                        h.mintTxHash
                          ? `https://basescan.org/tx/${h.mintTxHash}`
                          : `https://basescan.org/nft/${sbtAddress}/${h.tokenId}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-xs font-bold text-violet-300 underline"
                    >
                      {h.mintTxHash ? "Mint tx" : "View NFT"}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
