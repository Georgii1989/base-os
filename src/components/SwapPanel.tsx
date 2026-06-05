"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { WalletAssetBalance } from "@/components/WalletAssetBalance";
import { formatAssetBalance, maxSpendAmount } from "@/lib/assetBalance";
import { parseSwapPrefillParams, swapPrefillToState } from "@/lib/swapPrefill";

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

type SwapPanelProps = { embedded?: boolean };

export function SwapPanel({ embedded = false }: SwapPanelProps) {
  const searchParams = useSearchParams();
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
  const [prefillBanner, setPrefillBanner] = useState<string | null>(null);
  const appliedPrefillKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const prefill = parseSwapPrefillParams(searchParams);
    if (!prefill) {
      appliedPrefillKeyRef.current = null;
      setPrefillBanner(null);
      return;
    }
    const key = `${prefill.sell ?? ""}|${prefill.buy ?? ""}`;
    if (appliedPrefillKeyRef.current === key) return;
    const state = swapPrefillToState(prefill);
    if (!state) return;
    appliedPrefillKeyRef.current = key;
    if (state.sellPreset != null) {
      setSellPreset(state.sellPreset);
      setSellCustom(state.sellCustom ?? "");
    }
    if (state.buyPreset != null) {
      setBuyPreset(state.buyPreset);
      setBuyCustom(state.buyCustom ?? "");
    }
    const sellToken = state.sellPreset
      ? resolveSwapToken(state.sellPreset, state.sellCustom)
      : null;
    const buyToken = state.buyPreset ? resolveSwapToken(state.buyPreset, state.buyCustom) : null;
    if (sellToken && buyToken) {
      setPrefillBanner(`Swapping ${sellToken.symbol} → ${buyToken.symbol}`);
    } else if (sellToken) {
      setPrefillBanner(`Selling ${sellToken.symbol}`);
    } else if (buyToken) {
      setPrefillBanner(`Buying ${buyToken.symbol}`);
    }
  }, [searchParams]);

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

  const { data: ethBalance, isLoading: ethLoading, isError: ethError } = useBalance({
    address,
    chainId: base.id,
    query: { enabled: Boolean(address), refetchInterval: 12_000 },
  });
  const {
    data: sellErc20Balance,
    isLoading: sellErc20Loading,
    isError: sellErc20Error,
  } = useReadContract({
    address:
      sellToken && !isNativeEthToken(sellToken.address) ? sellToken.address : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: base.id,
    query: {
      enabled: Boolean(address && sellToken && !isNativeEthToken(sellToken.address)),
      refetchInterval: 12_000,
    },
  });

  const {
    data: buyErc20Balance,
    isLoading: buyErc20Loading,
  } = useReadContract({
    address: buyToken && !isNativeEthToken(buyToken.address) ? buyToken.address : undefined,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: base.id,
    query: {
      enabled: Boolean(address && buyToken && !isNativeEthToken(buyToken.address)),
      refetchInterval: 12_000,
    },
  });
  const { data: buyEthBalance, isLoading: buyEthLoading } = useBalance({
    address,
    chainId: base.id,
    query: {
      enabled: Boolean(address && buyToken && isNativeEthToken(buyToken.address)),
      refetchInterval: 12_000,
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
    chainId: base.id,
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

  const sellBalanceLoading =
    sellToken && isNativeEthToken(sellToken.address) ? ethLoading : sellErc20Loading;
  const sellBalanceError =
    sellToken && isNativeEthToken(sellToken.address) ? ethError : sellErc20Error;

  const sellBalanceValue = useMemo(() => {
    if (!sellToken) return null;
    if (isNativeEthToken(sellToken.address)) {
      return ethBalance?.value ?? null;
    }
    return sellErc20Balance != null ? (sellErc20Balance as bigint) : null;
  }, [sellToken, ethBalance, sellErc20Balance]);

  const balanceLabel =
    sellBalanceValue != null && sellToken
      ? formatAssetBalance(sellBalanceValue, sellToken.decimals, sellToken.symbol)
      : isConnected && !sellBalanceLoading && sellToken
        ? `0 ${sellToken.symbol}`
        : null;

  const buyBalanceLabel = useMemo(() => {
    if (!buyToken || !isConnected) return null;
    if (isNativeEthToken(buyToken.address)) {
      if (buyEthLoading) return null;
      const v = buyEthBalance?.value ?? BigInt(0);
      return formatAssetBalance(v, 18, buyToken.symbol);
    }
    if (buyErc20Loading) return null;
    const v = buyErc20Balance != null ? (buyErc20Balance as bigint) : BigInt(0);
    return formatAssetBalance(v, buyToken.decimals, buyToken.symbol);
  }, [buyToken, isConnected, buyEthBalance, buyErc20Balance, buyEthLoading, buyErc20Loading]);

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
    if (!sellToken || sellBalanceValue == null || sellBalanceValue <= BigInt(0)) return;
    setSellAmount(
      maxSpendAmount(
        sellBalanceValue,
        sellToken.decimals,
        isNativeEthToken(sellToken.address)
      )
    );
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
    <div className={embedded ? "grid gap-4" : "mx-auto grid max-w-lg gap-4"}>
      {!embedded ? (
        <div className="text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-violet-300/80">Swap</p>
          <h2 className="mt-1 text-2xl font-black text-white md:text-3xl">Trade on Base</h2>
        </div>
      ) : null}

      {apiMissing ? (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-center text-xs text-amber-100">
          Server needs <span className="font-mono">ZEROX_API_KEY</span>
        </div>
      ) : null}

      {prefillBanner ? (
        <p className="rounded-2xl border border-violet-300/25 bg-violet-500/10 px-4 py-2.5 text-center text-xs font-bold text-violet-100">
          {prefillBanner}
          <span className="font-normal text-violet-200/70"> · from portfolio</span>
        </p>
      ) : null}

      <div className="os-panel relative overflow-hidden p-1 shadow-[0_0_60px_rgba(139,92,246,0.12)]">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative rounded-[1.4rem] bg-black/40 p-4 backdrop-blur-sm md:p-5">
          {/* Sell row */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 transition focus-within:border-cyan-400/30">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                You pay
              </span>
            </div>
            <WalletAssetBalance
              chainLabel="Base"
              assetLabel={sellToken?.symbol ?? "token"}
              balanceLabel={balanceLabel}
              isConnected={isConnected}
              isLoading={Boolean(sellToken && sellBalanceLoading)}
              isError={sellBalanceError}
              onMax={
                sellBalanceValue != null && sellBalanceValue > BigInt(0)
                  ? setMaxAmount
                  : undefined
              }
              maxDisabled={!sellBalanceValue || sellBalanceValue <= BigInt(0)}
            />
            <div className="mt-3 flex items-center gap-3">
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
            {isConnected && buyToken ? (
              <p className="mt-1 text-xs font-bold text-slate-500">
                Balance on Base:{" "}
                <span className="tabular-nums text-slate-300">
                  {buyBalanceLabel ?? (buyEthLoading || buyErc20Loading ? "…" : `0 ${buyToken.symbol}`)}
                </span>
              </p>
            ) : null}
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
                className="os-cta os-display w-full py-4 text-base disabled:opacity-40"
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
