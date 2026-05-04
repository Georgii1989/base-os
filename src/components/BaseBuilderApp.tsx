"use client";

import { useMemo, useState } from "react";
import { createSiweMessage, generateSiweNonce } from "viem/siwe";
import { formatEther, parseEther } from "viem";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  usePublicClient,
  useSendTransaction,
  useSignMessage,
  useWaitForTransactionReceipt,
} from "wagmi";

const DEFAULT_RECIPIENT = "0x1111111111111111111111111111111111111111";

export function BaseBuilderApp() {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();
  const { data: txHash, sendTransaction, isPending: isSending } = useSendTransaction();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const [siweOk, setSiweOk] = useState(false);
  const [siweError, setSiweError] = useState<string | null>(null);
  const [tipEth, setTipEth] = useState("0.0005");
  const [tipStatus, setTipStatus] = useState<string | null>(null);

  const recipient = process.env.NEXT_PUBLIC_TIP_RECIPIENT || DEFAULT_RECIPIENT;

  const shortAddress = useMemo(() => {
    if (!address) return "not connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  async function handleSiwe() {
    setSiweError(null);
    setSiweOk(false);

    if (!isConnected || !address || !chainId || !publicClient) {
      setSiweError("Подключи кошелек перед SIWE.");
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
      const value = parseEther(tipEth || "0");
      if (value <= BigInt(0)) {
        setTipStatus("Сумма tip должна быть больше 0.");
        return;
      }

      sendTransaction({
        to: recipient as `0x${string}`,
        value,
      });
      setTipStatus("Транзакция отправляется в сеть Base...");
    } catch {
      setTipStatus("Некорректная сумма tip.");
    }
  }

  return (
    <section className="relative z-10 w-full max-w-3xl rounded-3xl border border-white/15 bg-black/45 p-5 text-white shadow-[0_0_50px_rgba(76,29,149,0.45)] backdrop-blur-xl">
      <h1 className="text-3xl font-black text-fuchsia-200 md:text-5xl">Base Builder Tip Jar</h1>
      <p className="mt-2 text-cyan-100/90">
        Standard Web App: wagmi + viem + SIWE + onchain tip flow.
      </p>

      <div className="mt-5 grid gap-3 rounded-2xl border border-cyan-300/30 bg-slate-950/50 p-4">
        <p className="text-sm text-cyan-100">Кошелек: <span className="font-bold">{shortAddress}</span></p>
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
          <button
            onClick={() => disconnect()}
            className="w-fit rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold"
          >
            Disconnect
          </button>
        )}
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
        <p className="text-sm text-emerald-100/90">Recipient: {recipient}</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            step="0.0001"
            min="0"
            value={tipEth}
            onChange={(e) => setTipEth(e.target.value)}
            className="w-36 rounded-lg border border-white/25 bg-black/40 px-3 py-2 text-white outline-none"
          />
          <button
            onClick={handleTip}
            disabled={!isConnected || isSending}
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
