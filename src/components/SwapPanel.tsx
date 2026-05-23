"use client";

import { useCallback, useMemo, useState } from "react";
import { formatUnits, parseUnits } from "viem";
import { base } from "wagmi/chains";
import {
  useAccount,
  useBalance,
  useReadContract,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useQuery } from "@tanstack/react-query";
import {
  formatSwapBalance,
  isNativeEthToken,
  resolveSwapToken,
  SWAP_TOKEN_PRESETS,
  type SwapQuoteResponse,
  type SwapTokenPreset,
} from "@/lib/swapTokens";
import { SwapTokenIcon } from "@/components/SwapTokenIcon";
import { SwapTokenSelectModal } from "@/components/SwapTokenSelectModal";

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

function TokenSelectButton({
  token,
  onClick,
}: {
  token: SwapTokenPreset | null;
  onClick: () => void;
}) {
  const symbol = token?.symbol ?? "Select";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] py-1.5 pl-1.5 pr-3 transition hover:border-cyan-400/40 hover:bg-white/[0.1]"
    >
      {token ? (
        <SwapTokenIcon address={token.address} symbol={token.symbol} size={28} showBaseBadge={false} />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs">?</span>
      )}
      <span className="text-sm font-black text-white">{symbol}</span>
      <span className="text-[10px] text-slate-500">▾</span>
    </button>
  );
}

function useTokenMeta(token: SwapTokenPreset | null) {
  const isNative = token ? isNativeEthToken(token.address) : false;
  const { data: onChainDecimals } = useReadContract({
    address: token && !isNative ? token.address : undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: Boolean(token && !isNative && token.id === "custom") },
  });
  const { data: onChainSymbol } = useReadContract({
    address: token && !isNative ? token.address : undefined,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: Boolean(token && !isNative && token.id === "custom") },
  });

  return useMemo(() => {
    if (!token) return null;
    const decimals =
      token.id === "custom" && onChainDecimals != null ? Number(onChainDecimals) : token.decimals;
    const symbol =
      token.id === "custom" && typeof onChainSymbol === "string" ? onChainSymbol : token.symbol;
    return { ...token, decimals, symbol };
  }, [token, onChainDecimals, onChainSymbol]);
}

export function SwapPanel() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const isOnBase = chainId === base.id;

  const [sellPreset, setSellPreset] = useState("eth");
  const [buyPreset, setBuyPreset] = useState("aerodrome-finance");
  const [sellCustom, setSellCustom] = useState("");
  const [buyCustom, setBuyCustom] = useState("");
  const [sellAmount, setSellAmount] = useState("0.001");
  const [formError, setFormError] = useState<string | null>(null);
  const [tokenModal, setTokenModal] = useState<"sell" | "buy" | null>(null);

  function selectSellToken(id: string, customAddress?: string) {
    if (id === "custom" && customAddress) {
      setSellPreset("custom");
      setSellCustom(customAddress);
    } else {
      setSellPreset(id);
      setSellCustom("");
    }
  }

  function selectBuyToken(id: string, customAddress?: string) {
    if (id === "custom" && customAddress) {
      setBuyPreset("custom");
      setBuyCustom(customAddress);
    } else {
      setBuyPreset(id);
      setBuyCustom("");
    }
  }

  const sellToken = useTokenMeta(resolveSwapToken(sellPreset, sellCustom));
  const buyToken = useTokenMeta(resolveSwapToken(buyPreset, buyCustom));

  const sellAmountWei = useMemo(() => {
    if (!sellToken || !sellAmount.trim()) return null;
    try {
      const v = parseUnits(sellAmount.trim(), sellToken.decimals);
      return v > BigInt(0) ? v : null;
    } catch {
      return null;
    }
  }, [sellAmount, sellToken]);

  const { data: ethBalance } = useBalance({ address, chainId: base.id });
  const { data: sellErc20Balance } = useReadContract({
    address:
      sellToken && !isNativeEthToken(sellToken.address) ? sellToken.address : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && sellToken && !isNativeEthToken(sellToken.address)),
    },
  });

  const quoteQuery = useQuery({
    queryKey: [
      "swap-quote",
      sellToken?.address,
      buyToken?.address,
      sellAmountWei?.toString(),
      address,
    ],
    enabled: Boolean(
      isConnected &&
        isOnBase &&
        address &&
        sellToken &&
        buyToken &&
        sellAmountWei &&
        sellToken.address.toLowerCase() !== buyToken.address.toLowerCase()
    ),
    staleTime: 12_000,
    refetchInterval: 20_000,
    queryFn: async (): Promise<SwapQuoteResponse> => {
      const params = new URLSearchParams({
        sellToken: sellToken!.address,
        buyToken: buyToken!.address,
        sellAmount: sellAmountWei!.toString(),
        taker: address!,
      });
      const res = await fetch(`/api/swap/quote?${params}`);
      const json = (await res.json()) as SwapQuoteResponse & { error?: string; hint?: string };
      if (!res.ok) {
        throw new Error(json.hint ? `${json.error} ${json.hint}` : json.error ?? "quote_failed");
      }
      return json;
    },
  });

  const quote = quoteQuery.data;
  const allowanceTarget = quote?.allowanceTarget;

  const { data: allowance } = useReadContract({
    address:
      sellToken && !isNativeEthToken(sellToken.address) ? sellToken.address : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && allowanceTarget ? [address, allowanceTarget] : undefined,
    query: {
      enabled: Boolean(
        address && sellToken && allowanceTarget && !isNativeEthToken(sellToken.address)
      ),
    },
  });

  const needsApproval =
    Boolean(quote?.needsApproval) &&
    sellAmountWei != null &&
    (allowance == null || allowance < sellAmountWei);

  const {
    writeContract: approve,
    data: approveHash,
    isPending: isApproving,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: approveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const {
    sendTransaction,
    data: swapHash,
    isPending: isSwapping,
    error: swapError,
    reset: resetSwap,
  } = useSendTransaction();

  const { isLoading: isSwapConfirming, isSuccess: swapConfirmed } =
    useWaitForTransactionReceipt({ hash: swapHash });

  const balanceRaw = useMemo(() => {
    if (!sellToken) return null;
    if (isNativeEthToken(sellToken.address)) {
      return ethBalance ? formatUnits(ethBalance.value, 18) : null;
    }
    if (sellErc20Balance == null) return null;
    return formatUnits(sellErc20Balance, sellToken.decimals);
  }, [sellToken, ethBalance, sellErc20Balance]);

  const balanceLabel =
    balanceRaw != null && sellToken
      ? formatSwapBalance(balanceRaw, sellToken.symbol)
      : null;

  const buyDisplay = useMemo(() => {
    if (!quote || !buyToken) return null;
    try {
      const raw = formatUnits(BigInt(quote.buyAmount), buyToken.decimals);
      return formatSwapBalance(raw, buyToken.symbol);
    } catch {
      return null;
    }
  }, [quote, buyToken]);

  const flip = useCallback(() => {
    setSellPreset(buyPreset);
    setBuyPreset(sellPreset);
    setSellCustom(buyCustom);
    setBuyCustom(sellCustom);
  }, [buyPreset, sellPreset, buyCustom, sellCustom]);

  function setMaxAmount() {
    if (!balanceRaw || !sellToken) return;
    const n = Number(balanceRaw);
    if (!Number.isFinite(n) || n <= 0) return;
    const max =
      isNativeEthToken(sellToken.address) && n > 0.0005 ? Math.max(0, n - 0.0003) : n;
    setSellAmount(max.toFixed(Math.min(6, sellToken.decimals)));
  }

  function handleApprove() {
    setFormError(null);
    if (!allowanceTarget || !sellToken || isNativeEthToken(sellToken.address)) return;
    resetApprove();
    approve({
      address: sellToken.address,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [allowanceTarget, sellAmountWei ?? BigInt(0)],
    });
  }

  function handleSwap() {
    setFormError(null);
    if (!quote || needsApproval) return;
    if (!isConnected || !isOnBase) {
      setFormError("Connect wallet on Base.");
      return;
    }
    resetSwap();
    sendTransaction({
      chainId: base.id,
      to: quote.transaction.to,
      data: quote.transaction.data,
      value: BigInt(quote.transaction.value),
    });
  }

  const apiMissing =
    quoteQuery.isError &&
    (quoteQuery.error.message.includes("not configured") ||
      quoteQuery.error.message.includes("ZEROX"));

  return (
    <div className="mx-auto grid max-w-lg gap-4">
      <div className="text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-violet-300/80">Swap</p>
        <h2 className="mt-1 text-2xl font-black text-white md:text-3xl">Trade on Base</h2>
      </div>

      {apiMissing ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-center text-xs text-amber-100">
          Server needs <span className="font-mono">ZEROX_API_KEY</span>
        </div>
      ) : null}

      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-slate-900/90 to-black/95 p-1 shadow-[0_0_80px_rgba(139,92,246,0.15)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative rounded-[1.4rem] bg-black/40 p-4 backdrop-blur-sm md:p-5">
          {/* Sell row */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition focus-within:border-cyan-400/30">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                You pay
              </span>
              {balanceLabel && isConnected ? (
                <button
                  type="button"
                  onClick={setMaxAmount}
                  className="text-[10px] font-bold text-cyan-400/90 hover:text-cyan-300"
                >
                  Max · {balanceLabel}
                </button>
              ) : null}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="text"
                inputMode="decimal"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                placeholder="0.0"
                className="min-w-0 flex-1 bg-transparent text-3xl font-black tabular-nums text-white outline-none placeholder:text-slate-700"
              />
              <TokenSelectButton token={sellToken} onClick={() => setTokenModal("sell")} />
            </div>
          </div>

          {/* Flip */}
          <div className="relative z-10 -my-3 flex justify-center">
            <button
              type="button"
              onClick={flip}
              aria-label="Flip tokens"
              className="rounded-xl border border-violet-400/40 bg-gradient-to-br from-violet-600/40 to-fuchsia-600/30 p-2.5 text-lg shadow-lg shadow-violet-900/40 transition hover:scale-105 hover:border-cyan-400/50"
            >
              ⇅
            </button>
          </div>

          {/* Buy row */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              You receive
            </span>
            <div className="mt-2 flex items-center gap-3">
              <p className="min-w-0 flex-1 truncate text-3xl font-black tabular-nums text-cyan-100">
                {quoteQuery.isLoading ? (
                  <span className="animate-pulse text-xl text-slate-500">Routing…</span>
                ) : (
                  buyDisplay ?? "—"
                )}
              </p>
              <TokenSelectButton token={buyToken} onClick={() => setTokenModal("buy")} />
            </div>
            {quoteQuery.isError && !apiMissing ? (
              <p className="mt-2 text-xs text-rose-400">{quoteQuery.error.message}</p>
            ) : null}
          </div>

          {/* Meta */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-slate-500">
            <span>Slippage 1%</span>
            {quote?.estimatedGas ? <span>Gas ~{quote.estimatedGas}</span> : null}
            <span className="text-violet-400/80">Powered by 0x</span>
          </div>

          {/* Actions */}
          {!isConnected ? (
            <p className="mt-4 text-center text-sm text-slate-400">Connect wallet to swap</p>
          ) : !isOnBase ? (
            <button
              type="button"
              disabled={isSwitchingChain}
              onClick={() => switchChainAsync({ chainId: base.id })}
              className="mt-4 w-full rounded-2xl border border-cyan-400/40 bg-cyan-500/15 py-3.5 text-sm font-black text-cyan-100"
            >
              Switch to Base
            </button>
          ) : (
            <div className="mt-4 grid gap-2">
              {needsApproval && !approveConfirmed ? (
                <button
                  type="button"
                  disabled={isApproving || isApproveConfirming || !allowanceTarget}
                  onClick={handleApprove}
                  className="w-full rounded-2xl border border-amber-400/35 bg-amber-500/15 py-3.5 text-sm font-black text-amber-100 disabled:opacity-50"
                >
                  {isApproving || isApproveConfirming
                    ? "Approving…"
                    : `Approve ${sellToken?.symbol}`}
                </button>
              ) : null}
              <button
                type="button"
                disabled={
                  !quote || quoteQuery.isLoading || needsApproval || isSwapping || isSwapConfirming
                }
                onClick={handleSwap}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 py-4 text-base font-black text-white shadow-[0_8px_32px_rgba(168,85,247,0.35)] transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
              >
                {isSwapping || isSwapConfirming
                  ? "Confirm in wallet…"
                  : !quote && quoteQuery.isLoading
                    ? "Getting quote…"
                    : "Swap"}
              </button>
            </div>
          )}

          {formError ? <p className="mt-3 text-center text-sm text-rose-400">{formError}</p> : null}
          {approveError ? (
            <p className="mt-2 text-center text-xs text-rose-400">
              {"shortMessage" in approveError && typeof approveError.shortMessage === "string"
                ? approveError.shortMessage
                : approveError.message}
            </p>
          ) : null}
          {swapError ? (
            <p className="mt-2 text-center text-xs text-rose-400">
              {"shortMessage" in swapError && typeof swapError.shortMessage === "string"
                ? swapError.shortMessage
                : swapError.message}
            </p>
          ) : null}

          {swapHash ? (
            <p className="mt-3 text-center text-xs text-slate-400">
              <a
                href={`https://basescan.org/tx/${swapHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-cyan-400 hover:underline"
              >
                {swapHash.slice(0, 14)}…
              </a>
              {swapConfirmed ? " · done" : " · pending"}
            </p>
          ) : null}
        </div>
      </div>

      {/* Quick picks */}
      <div className="flex flex-wrap justify-center gap-2 px-2">
        {["eth", "chainlink", "aerodrome-finance", "virtual-protocol", "venice-token", "morpho"].map((id) => {
          const t = SWAP_TOKEN_PRESETS.find((x) => x.id === id);
          if (!t) return null;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setBuyPreset(id)}
              className={`flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 text-[11px] font-bold transition hover:border-cyan-400/40 ${buyPreset === id ? "border-cyan-400/50 text-cyan-200" : "text-slate-400"}`}
            >
              <SwapTokenIcon address={t.address} symbol={t.symbol} size={22} showBaseBadge={false} />
              {t.symbol}
            </button>
          );
        })}
      </div>

      <SwapTokenSelectModal
        open={tokenModal === "sell"}
        onClose={() => setTokenModal(null)}
        selectedId={sellPreset}
        selectedAddress={sellCustom || undefined}
        onSelect={selectSellToken}
        walletAddress={address}
        excludeAddress={buyToken?.address}
      />
      <SwapTokenSelectModal
        open={tokenModal === "buy"}
        onClose={() => setTokenModal(null)}
        selectedId={buyPreset}
        selectedAddress={buyCustom || undefined}
        onSelect={selectBuyToken}
        walletAddress={address}
        excludeAddress={sellToken?.address}
      />

      <p className="text-center text-[10px] text-slate-600">
        Verify token contracts on BaseScan. Low liquidity pairs may fail.
      </p>
    </div>
  );
}
