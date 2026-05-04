"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSiweMessage, generateSiweNonce } from "viem/siwe";
import { formatEther, parseEther } from "viem";
import { base } from "wagmi/chains";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  usePublicClient,
  useSignMessage,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

const DEFAULT_TIPJAR = "0x47ad142c4f04431164737cACD601796932b7357A";
const TIPJAR_ABI = [
  {
    type: "function",
    name: "tip",
    stateMutability: "payable",
    inputs: [{ name: "message", type: "string", internalType: "string" }],
    outputs: [],
  },
] as const;

export function BaseBuilderApp() {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });
  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();
  const { data: txHash, isPending: isSending, writeContract } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const [siweOk, setSiweOk] = useState(false);
  const [siweError, setSiweError] = useState<string | null>(null);
  const [tipEth, setTipEth] = useState("0.0005");
  const [tipMessage, setTipMessage] = useState("Support Base Tip app");
  const [tipStatus, setTipStatus] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<string | null>(null);
  const autoSwitchTriedRef = useRef(false);

  const tipJarAddress = process.env.NEXT_PUBLIC_TIPJAR_ADDRESS || DEFAULT_TIPJAR;
  const isOnBase = chainId === base.id;

  const shortAddress = useMemo(() => {
    if (!address) return "not connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  useEffect(() => {
    if (!isConnected) {
      autoSwitchTriedRef.current = false;
      return;
    }
    if (isOnBase || autoSwitchTriedRef.current || isSwitchingChain) return;

    autoSwitchTriedRef.current = true;
    switchChainAsync({ chainId: base.id })
      .then(() => setNetworkStatus("Сеть автоматически переключена на Base."))
      .catch(() =>
        setNetworkStatus("Автопереключение не сработало. Нажми Switch to Base и подтверди в кошельке.")
      );
  }, [isConnected, isOnBase, isSwitchingChain, switchChainAsync]);

  async function handleSiwe() {
    setSiweError(null);
    setSiweOk(false);

    if (!isConnected || !address || !chainId || !publicClient) {
      setSiweError("Подключи кошелек перед SIWE.");
      return;
    }
    if (!isOnBase) {
      setSiweError("Сначала переключи сеть кошелька на Base.");
      return;
    }

    try {
      const nonce = generateSiweNonce();
      const message = createSiweMessage({
        address,
        chainId,
        domain: window.location.host,
        nonce,
        uri: window.location.origin,
        version: "1",
      });

      const signature = await signMessageAsync({ message });
      const valid = await publicClient.verifySiweMessage({ message, signature });

      if (!valid) {
        setSiweError("SIWE подпись не прошла проверку.");
        return;
      }

      setSiweOk(true);
    } catch {
      setSiweError("Не удалось выполнить SIWE, попробуй еще раз.");
    }
  }

  function handleTip() {
    setTipStatus(null);
    try {
      if (!isOnBase) {
        setTipStatus("Сначала переключи сеть на Base.");
        return;
      }
      const value = parseEther(tipEth || "0");
      if (value <= BigInt(0)) {
        setTipStatus("Сумма tip должна быть больше 0.");
        return;
      }

      writeContract({
        address: tipJarAddress as `0x${string}`,
        chainId: base.id,
        abi: TIPJAR_ABI,
        functionName: "tip",
        args: [tipMessage],
        value,
      });
      setTipStatus("Транзакция в TipJar отправляется в сеть Base...");
    } catch {
      setTipStatus("Некорректная сумма tip.");
    }
  }

  async function handleSwitchToBase() {
    setNetworkStatus(null);
    try {
      await switchChainAsync({ chainId: base.id });
      setNetworkStatus("Сеть переключена на Base.");
    } catch {
      setNetworkStatus("Не удалось переключить сеть. Подтверди смену сети в кошельке.");
    }
  }

  return (
    <section className="relative z-10 w-full max-w-3xl rounded-3xl border border-white/15 bg-black/45 p-5 text-white shadow-[0_0_50px_rgba(76,29,149,0.45)] backdrop-blur-xl">
      <h1 className="text-3xl font-black text-fuchsia-200 md:text-5xl">Base Tip</h1>

      <div className="mt-5 grid gap-3 rounded-2xl border border-cyan-300/30 bg-slate-950/50 p-4">
        <p className="text-sm text-cyan-100">Кошелек: <span className="font-bold">{shortAddress}</span></p>
        <p className="text-sm text-cyan-100">
          Сеть:{" "}
          <span className="font-bold">
            {chainId ? `${chainId}${isOnBase ? " (Base)" : " (wrong network)"}` : "—"}
          </span>
        </p>
        <p className="text-sm text-cyan-100">
          Баланс:{" "}
          <span className="font-bold">
            {balance ? `${Number(formatEther(balance.value)).toFixed(4)} ETH` : "—"}
          </span>
        </p>

        {!isConnected ? (
          <div className="flex flex-wrap gap-2">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() => connect({ connector })}
                className="rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-500 px-4 py-2 text-sm font-black"
              >
                {isConnecting ? "Connecting..." : `Connect: ${connector.name}`}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {!isOnBase ? (
              <button
                onClick={handleSwitchToBase}
                disabled={isSwitchingChain}
                className="rounded-xl bg-cyan-500/85 px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSwitchingChain ? "Switching..." : "Switch to Base"}
              </button>
            ) : null}
            <button
              onClick={() => disconnect()}
              className="w-fit rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold"
            >
              Disconnect
            </button>
          </div>
        )}
        {networkStatus ? <p className="text-sm text-cyan-200">{networkStatus}</p> : null}
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-fuchsia-300/30 bg-slate-950/50 p-4">
        <h2 className="text-xl font-black text-fuchsia-200">Sign-In with Ethereum</h2>
        <button
          onClick={handleSiwe}
          disabled={!isConnected}
          className="w-fit rounded-xl bg-fuchsia-500/85 px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {siweOk ? "SIWE verified" : "Run SIWE auth"}
        </button>
        {siweError ? <p className="text-sm text-rose-300">{siweError}</p> : null}
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-emerald-300/30 bg-slate-950/50 p-4">
        <h2 className="text-xl font-black text-emerald-200">Send onchain tip</h2>
        <p className="text-sm text-emerald-100/90">TipJar: {tipJarAddress}</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            step="0.0001"
            min="0"
            value={tipEth}
            onChange={(e) => setTipEth(e.target.value)}
            className="w-36 rounded-lg border border-white/25 bg-black/40 px-3 py-2 text-white outline-none"
          />
          <input
            type="text"
            maxLength={120}
            value={tipMessage}
            onChange={(e) => setTipMessage(e.target.value)}
            placeholder="Tip message"
            className="min-w-52 flex-1 rounded-lg border border-white/25 bg-black/40 px-3 py-2 text-white outline-none"
          />
          <button
            onClick={handleTip}
            disabled={!isConnected || isSending || !isOnBase}
            className="rounded-xl bg-emerald-500/85 px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? "Sending..." : "Send tip"}
          </button>
        </div>
        {tipStatus ? <p className="text-sm text-cyan-200">{tipStatus}</p> : null}
        {txHash ? (
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-bold text-cyan-300 underline"
          >
            View tx on BaseScan
          </a>
        ) : null}
        {txConfirmed ? <p className="text-sm text-emerald-300">Tip confirmed onchain.</p> : null}
      </div>
    </section>
  );
}
