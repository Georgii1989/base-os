"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { formatUnits } from "viem";
import { base } from "wagmi/chains";
import { useBalance, useReadContracts } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatUsd } from "@/lib/baseAnalyticsFormat";
import {
  isNativeEthToken,
  SWAP_TOKEN_PRESETS,
  type SwapTokenPreset,
} from "@/lib/swapTokens";
import { shortenAddress, SwapTokenIcon } from "@/components/SwapTokenIcon";

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const POPULAR_IDS = ["eth", "chainlink", "aerodrome-finance", "virtual-protocol", "morpho"];

type LookupToken = SwapTokenPreset & {
  logoURI?: string | null;
  priceUsd?: number | null;
};

type TokenRow = LookupToken & {
  balanceRaw: string | null;
  balanceUsd: number | null;
  priceUsd: number | null;
};

function formatTokenPrice(usd: number): string {
  if (usd >= 1000) {
    return `$${usd.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
  }
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd >= 0.0001) return `$${usd.toFixed(4)}`;
  return `$${usd.toExponential(2)}`;
}

function formatTokenAmount(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  if (n < 1) return n.toFixed(4);
  if (n < 1000) return n.toFixed(3);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pickToken(
  token: TokenRow,
  onPick: (id: string, customAddress?: string) => void,
  onClose: () => void
) {
  if (token.id === "custom") {
    onPick("custom", token.address);
  } else {
    onPick(token.id);
  }
  onClose();
}

export function SwapTokenSelectModal({
  open,
  onClose,
  selectedId,
  selectedAddress,
  onSelect,
  walletAddress,
  excludeAddress,
}: {
  open: boolean;
  onClose: () => void;
  selectedId: string;
  selectedAddress?: string;
  onSelect: (id: string, customAddress?: string) => void;
  walletAddress?: `0x${string}`;
  excludeAddress?: string;
}) {
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length >= 2;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const marketQuery = useQuery({
    queryKey: ["swap-market"],
    queryFn: async (): Promise<Record<string, number>> => {
      const res = await fetch("/api/swap/market");
      if (!res.ok) return {};
      const json = (await res.json()) as { prices?: Record<string, number> };
      return json.prices ?? {};
    },
    staleTime: 60_000,
    enabled: open,
  });

  const searchQuery = useQuery({
    queryKey: ["swap-token-search", trimmedQuery],
    queryFn: async (): Promise<LookupToken[]> => {
      const res = await fetch(`/api/swap/lookup?q=${encodeURIComponent(trimmedQuery)}`);
      if (res.status === 404) return [];
      if (!res.ok) return [];
      const json = (await res.json()) as { tokens?: LookupToken[] };
      return json.tokens ?? [];
    },
    staleTime: 30_000,
    enabled: open && isSearching,
  });

  const { data: ethBalance } = useBalance({
    address: walletAddress,
    chainId: base.id,
    query: { enabled: open && Boolean(walletAddress) },
  });

  const erc20Tokens = useMemo(
    () => SWAP_TOKEN_PRESETS.filter((t) => !isNativeEthToken(t.address)),
    []
  );

  const { data: erc20Balances } = useReadContracts({
    contracts: erc20Tokens.map((t) => ({
      address: t.address,
      abi: ERC20_BALANCE_ABI,
      functionName: "balanceOf" as const,
      args: [walletAddress!] as const,
      chainId: base.id,
    })),
    query: { enabled: open && Boolean(walletAddress) && !isSearching },
  });

  const enrich = useMemo(() => {
    const prices = marketQuery.data ?? {};
    const exclude = excludeAddress?.toLowerCase();

    return (tokens: LookupToken[]): TokenRow[] =>
      tokens
        .filter((t) => t.address.toLowerCase() !== exclude)
        .map((token) => {
          const priceUsd =
            prices[token.address.toLowerCase()] ?? token.priceUsd ?? null;
          let balanceRaw: string | null = null;

          if (walletAddress) {
            if (isNativeEthToken(token.address) && ethBalance) {
              balanceRaw = formatUnits(ethBalance.value, ethBalance.decimals);
            } else if (!isNativeEthToken(token.address)) {
              const idx = erc20Tokens.findIndex(
                (t) => t.address.toLowerCase() === token.address.toLowerCase()
              );
              const bal = idx >= 0 ? erc20Balances?.[idx]?.result : undefined;
              if (typeof bal === "bigint") {
                balanceRaw = formatUnits(bal, token.decimals);
              }
            }
          }

          const balanceUsd =
            balanceRaw != null && priceUsd != null ? Number(balanceRaw) * priceUsd : null;

          return { ...token, balanceRaw, balanceUsd, priceUsd };
        });
  }, [
    marketQuery.data,
    excludeAddress,
    walletAddress,
    ethBalance,
    erc20Tokens,
    erc20Balances,
  ]);

  const presetRows = useMemo(() => enrich(SWAP_TOKEN_PRESETS), [enrich]);

  const filteredPresets = useMemo(() => {
    if (!isSearching) return presetRows;
    const q = trimmedQuery.toLowerCase();
    return presetRows.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.address.toLowerCase().includes(q)
    );
  }, [presetRows, isSearching, trimmedQuery]);

  const searchRows = useMemo(() => {
    if (!isSearching) return [];
    return enrich(searchQuery.data ?? []);
  }, [isSearching, searchQuery.data, enrich]);

  const displayRows = useMemo(() => {
    if (!isSearching) return presetRows;
    const seen = new Set<string>();
    const merged: TokenRow[] = [];
    for (const t of [...searchRows, ...filteredPresets]) {
      const key = t.address.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(t);
    }
    return merged;
  }, [isSearching, presetRows, searchRows, filteredPresets]);

  const { owned, rest } = useMemo(() => {
    const ownedRows = displayRows.filter((t) => t.balanceRaw != null && Number(t.balanceRaw) > 0);
    const ownedIds = new Set(ownedRows.map((t) => t.address.toLowerCase()));
    return {
      owned: ownedRows.sort((a, b) => (b.balanceUsd ?? 0) - (a.balanceUsd ?? 0)),
      rest: displayRows
        .filter((t) => !ownedIds.has(t.address.toLowerCase()))
        .sort((a, b) => (a.cmcRank ?? 9999) - (b.cmcRank ?? 9999)),
    };
  }, [displayRows]);

  const isSelected = (token: TokenRow) =>
    token.id === "custom"
      ? selectedId === "custom" &&
        selectedAddress?.toLowerCase() === token.address.toLowerCase()
      : selectedId === token.id;

  if (!open || !mounted) return null;

  const showEmpty =
    isSearching &&
    !searchQuery.isLoading &&
    displayRows.length === 0 &&
    searchQuery.isFetched;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto overscroll-contain p-3 sm:p-6"
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="swap-token-modal-title"
        className="relative my-auto flex w-full max-w-md min-h-0 max-h-[min(85dvh,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#131313] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <h3 id="swap-token-modal-title" className="text-lg font-bold text-white">
            Select a token
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-4 pt-4">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <span className="text-slate-500">⌕</span>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or paste address"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </div>

          {!isSearching ? (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {POPULAR_IDS.map((id) => {
                const t = SWAP_TOKEN_PRESETS.find((x) => x.id === id);
                if (!t || t.address.toLowerCase() === excludeAddress?.toLowerCase()) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      onSelect(id);
                      onClose();
                    }}
                    className="flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5 transition hover:border-white/20 hover:bg-white/[0.06]"
                  >
                    <SwapTokenIcon address={t.address} symbol={t.symbol} size={32} />
                    <span className="text-[11px] font-bold text-slate-300">{t.symbol}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4">
          {searchQuery.isLoading && isSearching ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">Searching…</p>
          ) : null}
          {owned.length > 0 ? (
            <TokenSection
              title="Your tokens"
              tokens={owned}
              isSelected={isSelected}
              onPick={onSelect}
              onClose={onClose}
            />
          ) : null}
          <TokenSection
            title={
              isSearching
                ? "Search results"
                : owned.length > 0
                  ? "Tokens on Base"
                  : "Popular tokens"
            }
            tokens={rest}
            isSelected={isSelected}
            onPick={onSelect}
            onClose={onClose}
          />
          {showEmpty ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">
              No token found. Paste a valid Base contract address.
            </p>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

function TokenSection({
  title,
  tokens,
  isSelected,
  onPick,
  onClose,
}: {
  title: string;
  tokens: TokenRow[];
  isSelected: (token: TokenRow) => boolean;
  onPick: (id: string, customAddress?: string) => void;
  onClose: () => void;
}) {
  if (tokens.length === 0) return null;

  return (
    <div className="mb-2">
      <p className="px-3 py-2 text-xs font-semibold text-slate-500">{title}</p>
      <ul>
        {tokens.map((token) => {
          const hasBalance = token.balanceRaw != null && Number(token.balanceRaw) > 0;
          return (
            <li key={token.address}>
              <button
                type="button"
                onClick={() => pickToken(token, onPick, onClose)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.06] ${
                  isSelected(token) ? "bg-white/[0.08]" : ""
                }`}
              >
                <SwapTokenIcon
                  address={token.address}
                  symbol={token.symbol}
                  size={40}
                  logoURI={token.logoURI}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">{token.symbol}</p>
                  <p className="truncate text-xs text-slate-500">
                    {token.name !== token.symbol ? `${token.name} · ` : ""}
                    {shortenAddress(token.address)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {hasBalance ? (
                    <>
                      <p className="text-sm font-medium text-white">
                        {formatUsd(token.balanceUsd)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatTokenAmount(token.balanceRaw!)}
                      </p>
                    </>
                  ) : token.priceUsd != null ? (
                    <p className="text-sm font-medium text-slate-300">
                      {formatTokenPrice(token.priceUsd)}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-600">—</p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
