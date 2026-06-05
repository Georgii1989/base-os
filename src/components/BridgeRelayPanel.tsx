"use client";

import { useMemo, useState } from "react";
import { parseUnits } from "viem";
import {
  useAccount,
  useBalance,
  useReadContract,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  BRIDGE_CHAINS,
  defaultBridgePair,
  getBridgeChain,
  officialBridgeUrl,
  type BridgeChainId,
  type BridgeTokenId,
} from "@/lib/bridgeChains";
import { BridgeChainIcon } from "@/components/BridgeChainIcon";
import type { RelayQuoteResponse, RelayStatusResponse } from "@/lib/relayBridge";
import { BridgeChainSelect } from "@/components/BridgeChainSelect";
import { WalletAssetBalance } from "@/components/WalletAssetBalance";
import { formatAssetBalance, maxSpendAmount } from "@/lib/assetBalance";

const ERC20_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

async function pollRelayStatus(requestId: string, maxMs = 120_000): Promise<RelayStatusResponse> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const res = await fetch(`/api/bridge/relay/status?requestId=${encodeURIComponent(requestId)}`);
    if (res.ok) {
      const json = (await res.json()) as RelayStatusResponse;
      if (json.status === "success" || json.status === "failure" || json.status === "refund") {
        return json;
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return { status: "timeout" };
}

export function BridgeRelayPanel() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [fromChainId, setFromChainId] = useState<BridgeChainId>(1);
  const [toChainId, setToChainId] = useState<BridgeChainId>(8453);
  const [tokenId, setTokenId] = useState<BridgeTokenId>("eth");
  const [amount, setAmount] = useState("0.01");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fromChain = getBridgeChain(fromChainId)!;
  const toChain = getBridgeChain(toChainId)!;
  const token = fromChain.tokens[tokenId];

  const amountWei = useMemo(() => {
    try {
      const v = parseUnits(amount.trim() || "0", token.decimals);
      return v > BigInt(0) ? v : null;
    } catch {
      return null;
    }
  }, [amount, token.decimals]);

  const { data: nativeBalance, isLoading: nativeLoading, isError: nativeError } = useBalance({
    address,
    chainId: fromChainId,
    query: {
      enabled: tokenId === "eth" && Boolean(address),
      refetchInterval: 12_000,
    },
  });
  const {
    data: usdcBalance,
    isLoading: usdcLoading,
    isError: usdcError,
  } = useReadContract({
    address: tokenId === "usdc" ? token.address : undefined,
    abi: ERC20_BALANCE_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: fromChainId,
    query: {
      enabled: tokenId === "usdc" && Boolean(address),
      refetchInterval: 12_000,
    },
  });

  const balance =
    tokenId === "eth" && nativeBalance
      ? { value: nativeBalance.value, decimals: nativeBalance.decimals, symbol: nativeBalance.symbol }
      : tokenId === "usdc" && usdcBalance != null
        ? { value: usdcBalance as bigint, decimals: token.decimals, symbol: token.symbol }
        : null;

  const quoteQuery = useQuery({
    queryKey: [
      "relay-bridge-quote",
      address,
      fromChainId,
      toChainId,
      token.address,
      toChain.tokens[tokenId].address,
      amountWei?.toString(),
    ],
    enabled: Boolean(isConnected && address && amountWei && fromChainId !== toChainId),
    staleTime: 15_000,
    refetchInterval: 25_000,
    queryFn: async (): Promise<RelayQuoteResponse> => {
      const res = await fetch("/api/bridge/relay/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: address,
          originChainId: fromChainId,
          destinationChainId: toChainId,
          originCurrency: token.address,
          destinationCurrency: toChain.tokens[tokenId].address,
          amount: amountWei!.toString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "quote_failed");
      }
      return json as RelayQuoteResponse;
    },
  });

  const { sendTransactionAsync } = useSendTransaction();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [txChainId, setTxChainId] = useState<BridgeChainId | undefined>();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const bridgeMutation = useMutation({
    mutationFn: async (quote: RelayQuoteResponse) => {
      setError(null);
      setStatusMsg("Preparing bridge…");
      for (const step of quote.steps ?? []) {
        if (step.kind !== "transaction") continue;
        for (const item of step.items ?? []) {
          if (item.status === "complete" || !item.data) continue;
          const { chainId: relayChainId, to, data, value } = item.data;
          const bridgeChainId = relayChainId as BridgeChainId;
          if (chainId !== relayChainId) {
            setStatusMsg(`Switch to ${getBridgeChain(bridgeChainId)?.name ?? "network"}…`);
            await switchChainAsync({ chainId: bridgeChainId });
          }
          setStatusMsg("Confirm in wallet…");
          const hash = await sendTransactionAsync({
            chainId: bridgeChainId,
            to,
            data,
            value: BigInt(value ?? "0"),
          });
          setTxHash(hash);
          setTxChainId(bridgeChainId);
          setStatusMsg("Waiting for confirmation…");
          if (item.check?.endpoint && step.requestId) {
            const status = await pollRelayStatus(step.requestId);
            if (status.status === "failure") throw new Error("Bridge failed on destination.");
            if (status.status === "timeout") setStatusMsg("Submitted — bridge may still be processing.");
          }
        }
      }
      setStatusMsg("Bridge submitted!");
    },
    onError: (e: Error) => {
      setError(e.message);
      setStatusMsg(null);
    },
  });

  function flipChains() {
    setFromChainId(toChainId);
    setToChainId(fromChainId);
  }

  function onFromChange(id: BridgeChainId) {
    setFromChainId(id);
    if (id === toChainId) setToChainId(defaultBridgePair(id));
    if (id === 56) setTokenId((t) => (t === "eth" ? "eth" : t));
  }

  const balanceLoading = tokenId === "eth" ? nativeLoading : usdcLoading;
  const balanceError = tokenId === "eth" ? nativeError : usdcError;
  const assetSymbol = tokenId === "eth" ? fromChain.nativeSymbol : token.symbol;

  function setMaxAmount() {
    if (!balance || balance.value <= BigInt(0)) return;
    setAmount(maxSpendAmount(balance.value, balance.decimals, tokenId === "eth"));
  }

  const balanceLabel =
    balance != null
      ? formatAssetBalance(balance.value, balance.decimals, balance.symbol)
      : isConnected && !balanceLoading
        ? `0 ${assetSymbol}`
        : null;

  const outAmount = quoteQuery.data?.details?.currencyOut?.amountFormatted;
  const timeEst = quoteQuery.data?.details?.timeEstimate;

  return (
    <div className="grid gap-4">
      <div className="os-panel p-4">
        <div className="grid gap-3">
          <BridgeChainSelect
            label="From"
            value={fromChainId}
            onChange={onFromChange}
            chains={BRIDGE_CHAINS}
          />

          <div className="flex justify-center">
            <button
              type="button"
              onClick={flipChains}
              className="rounded-xl border border-violet-400/40 bg-violet-500/15 px-3 py-1.5 text-sm"
              aria-label="Flip chains"
            >
              ⇅
            </button>
          </div>

          <BridgeChainSelect
            label="To"
            value={toChainId}
            onChange={setToChainId}
            chains={BRIDGE_CHAINS.filter((c) => c.id !== fromChainId)}
          />

          <div className="flex gap-2">
            {(["eth", "usdc"] as const).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTokenId(id)}
                className={`flex-1 rounded-xl border py-2 text-xs font-bold uppercase ${
                  tokenId === id
                    ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
                    : "border-white/10 text-slate-400"
                }`}
              >
                {id === "eth" ? fromChain.nativeSymbol : "USDC"}
              </button>
            ))}
          </div>

          <WalletAssetBalance
            chainLabel={fromChain.name}
            assetLabel={assetSymbol}
            balanceLabel={balanceLabel}
            isConnected={isConnected}
            isLoading={balanceLoading}
            isError={balanceError}
            onMax={balance && balance.value > BigInt(0) ? setMaxAmount : undefined}
            maxDisabled={!balance || balance.value <= BigInt(0)}
          />

          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Amount
            </span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-2xl font-black tabular-nums text-white outline-none focus:border-cyan-400/40"
              inputMode="decimal"
              placeholder="0.0"
            />
          </div>

          {quoteQuery.data ? (
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100">
              You receive ≈ {outAmount ?? "—"} {toChain.tokens[tokenId].symbol}
              {timeEst ? ` · ~${timeEst}s` : ""}
            </div>
          ) : null}
          {quoteQuery.isError ? (
            <p className="text-xs text-rose-400">{quoteQuery.error.message}</p>
          ) : null}
        </div>
      </div>

      {!isConnected ? (
        <p className="text-center text-sm text-slate-400">Connect wallet to bridge</p>
      ) : (
        <button
          type="button"
          disabled={
            !quoteQuery.data ||
            quoteQuery.isLoading ||
            bridgeMutation.isPending ||
            isConfirming
          }
          onClick={() => quoteQuery.data && bridgeMutation.mutate(quoteQuery.data)}
          className="w-full rounded-2xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-500 py-4 text-base font-black text-white disabled:opacity-40"
        >
          {bridgeMutation.isPending || isConfirming ? "Bridging…" : "Bridge via Relay"}
        </button>
      )}

      {statusMsg ? <p className="text-center text-xs text-cyan-300">{statusMsg}</p> : null}
      {error ? <p className="text-center text-xs text-rose-400">{error}</p> : null}
      {txHash ? (
        <p className="text-center text-xs text-slate-400">
          Tx{" "}
          <a
            href={`${getBridgeChain(txChainId ?? fromChainId)?.txExplorer ?? "https://etherscan.io"}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-cyan-400 hover:underline"
          >
            {txHash.slice(0, 12)}…
          </a>
        </p>
      ) : null}

      <p className="text-center text-[10px] text-slate-600">
        Powered by Relay · fast routes across ETH, BNB, Arbitrum, Linea, zkSync & Base
      </p>

      {fromChain.officialBridge && toChain.officialBridge && fromChainId !== 56 ? (
        <div className="os-panel p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Prefer canonical route?
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Official OP Stack bridge for {fromChain.name} ↔ {toChain.name}
          </p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <BridgeChainIcon chainId={fromChainId} size={32} />
            <span className="text-slate-500">→</span>
            <BridgeChainIcon chainId={toChainId} size={32} />
          </div>
          <a
            href={officialBridgeUrl(fromChainId, toChainId)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block w-full rounded-xl border border-cyan-400/35 bg-cyan-500/10 py-3 text-center text-sm font-black text-cyan-100"
          >
            Open official bridge ↗
          </a>
        </div>
      ) : null}
    </div>
  );
}
