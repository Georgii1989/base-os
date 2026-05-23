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
  isNativeEthToken,
  resolveSwapToken,
  SWAP_TOKEN_PRESETS,
  type SwapQuoteResponse,
  type SwapTokenPreset,
} from "@/lib/swapTokens";

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

function TokenSelect({
  label,
  value,
  customAddress,
  onChange,
  onCustomChange,
}: {
  label: string;
  value: string;
  customAddress: string;
  onChange: (id: string) => void;
  onCustomChange: (addr: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 text-white outline-none focus:border-cyan-300/50"
      >
        {SWAP_TOKEN_PRESETS.map((t) => (
          <option key={t.id} value={t.id}>
            {t.symbol} — {t.name}
          </option>
        ))}
        <option value="custom">Custom address…</option>
      </select>
      {value === "custom" ? (
        <input
          type="text"
          value={customAddress}
          onChange={(e) => onCustomChange(e.target.value)}
          placeholder="0x… token on Base"
          className="mt-2 w-full rounded-xl border border-white/12 bg-black/40 px-3 py-2.5 font-mono text-sm text-white outline-none focus:border-cyan-300/50"
        />
      ) : null}
    </label>
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
  const [buyPreset, setBuyPreset] = useState("usdc");
  const [sellCustom, setSellCustom] = useState("");
  const [buyCustom, setBuyCustom] = useState("");
  const [sellAmount, setSellAmount] = useState("0.001");
  const [formError, setFormError] = useState<string | null>(null);

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

  const balanceLabel = useMemo(() => {
    if (!sellToken) return null;
    if (isNativeEthToken(sellToken.address)) {
      return ethBalance ? `${formatUnits(ethBalance.value, 18)} ETH` : "—";
    }
    if (sellErc20Balance == null) return "…";
    return `${formatUnits(sellErc20Balance, sellToken.decimals)} ${sellToken.symbol}`;
  }, [sellToken, ethBalance, sellErc20Balance]);

  const buyDisplay = useMemo(() => {
    if (!quote || !buyToken) return null;
    try {
      return `${formatUnits(BigInt(quote.buyAmount), buyToken.decimals)} ${buyToken.symbol}`;
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
    <div className="grid gap-5">
      <section className="rounded-3xl border border-violet-300/25 bg-gradient-to-br from-violet-500/10 via-slate-950/60 to-cyan-500/10 p-6 md:p-8">
        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-violet-200/90">Swap</p>
        <h2 className="mt-2 text-3xl font-black text-white">Trade on Base</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          Best route via 0x aggregator (Uniswap, Aerodrome & more). You sign and pay gas. Not
          financial advice — verify token addresses.
        </p>
      </section>

      {apiMissing ? (
        <section className="rounded-3xl border border-amber-300/30 bg-amber-500/10 p-5 text-sm text-amber-100">
          Swap quotes need <span className="font-mono">ZEROX_API_KEY</span> on the server (free key via{" "}
          <a
            href="https://docs.0x.org/docs/introduction/quickstart/getting-started"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            0x docs
          </a>
          ).
        </section>
      ) : null}

      <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <TokenSelect
            label="You pay"
            value={sellPreset}
            customAddress={sellCustom}
            onChange={setSellPreset}
            onCustomChange={setSellCustom}
          />
          <TokenSelect
            label="You receive"
            value={buyPreset}
            customAddress={buyCustom}
            onChange={setBuyPreset}
            onCustomChange={setBuyCustom}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-[10rem] flex-1">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
              Amount
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 font-mono text-white outline-none focus:border-cyan-300/50"
            />
          </label>
          <button
            type="button"
            onClick={flip}
            className="rounded-xl border border-white/15 px-4 py-3 text-sm font-bold text-slate-200 hover:border-cyan-300/40"
          >
            Flip ↕
          </button>
        </div>

        {balanceLabel ? (
          <p className="mt-2 text-xs text-slate-500">
            Balance: <span className="font-mono text-slate-300">{balanceLabel}</span>
          </p>
        ) : null}

        <div className="mt-4 rounded-2xl border border-white/8 bg-black/30 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">You receive ≈</p>
          <p className="mt-1 text-2xl font-black text-cyan-100">
            {quoteQuery.isLoading ? "Fetching route…" : buyDisplay ?? "—"}
          </p>
          {quoteQuery.isError && !apiMissing ? (
            <p className="mt-2 text-sm text-rose-300">{quoteQuery.error.message}</p>
          ) : null}
          {quote?.estimatedGas ? (
            <p className="mt-1 text-xs text-slate-500">Est. gas units: {quote.estimatedGas}</p>
          ) : null}
        </div>

        {!isConnected ? (
          <p className="mt-4 text-sm text-amber-200">Connect wallet in the header to swap.</p>
        ) : !isOnBase ? (
          <button
            type="button"
            disabled={isSwitchingChain}
            onClick={() => switchChainAsync({ chainId: base.id })}
            className="mt-4 rounded-xl border border-cyan-300/40 bg-cyan-500/15 px-4 py-2 text-sm font-bold text-cyan-100"
          >
            Switch to Base
          </button>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            {needsApproval && !approveConfirmed ? (
              <button
                type="button"
                disabled={isApproving || isApproveConfirming || !allowanceTarget}
                onClick={handleApprove}
                className="rounded-xl border border-amber-300/40 bg-amber-500/15 px-4 py-2.5 text-sm font-black text-amber-100 disabled:opacity-50"
              >
                {isApproving || isApproveConfirming ? "Approving…" : `Approve ${sellToken?.symbol}`}
              </button>
            ) : null}
            <button
              type="button"
              disabled={
                !quote || quoteQuery.isLoading || needsApproval || isSwapping || isSwapConfirming
              }
              onClick={handleSwap}
              className="rounded-xl bg-gradient-to-r from-violet-500/80 to-cyan-500/70 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
            >
              {isSwapping || isSwapConfirming ? "Confirm in wallet…" : "Swap"}
            </button>
          </div>
        )}

        {formError ? <p className="mt-3 text-sm text-rose-300">{formError}</p> : null}
        {approveError ? (
          <p className="mt-3 text-sm text-rose-300">
            {"shortMessage" in approveError && typeof approveError.shortMessage === "string"
              ? approveError.shortMessage
              : approveError.message}
          </p>
        ) : null}
        {swapError ? (
          <p className="mt-3 text-sm text-rose-300">
            {"shortMessage" in swapError && typeof swapError.shortMessage === "string"
              ? swapError.shortMessage
              : swapError.message}
          </p>
        ) : null}

        {swapHash ? (
          <p className="mt-3 text-sm text-slate-400">
            Tx:{" "}
            <a
              href={`https://basescan.org/tx/${swapHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-cyan-300 hover:underline"
            >
              {swapHash.slice(0, 12)}…
            </a>
            {swapConfirmed ? " · confirmed" : " · confirming"}
          </p>
        ) : null}
      </section>

      <p className="text-xs text-slate-600">
        Routes from 0x. Slippage 1%. Low-liquidity tokens can fail — verify the contract on BaseScan.
      </p>
    </div>
  );
}
