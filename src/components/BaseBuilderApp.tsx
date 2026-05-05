"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSiweMessage, generateSiweNonce } from "viem/siwe";
import { formatEther, parseAbiItem, parseEther } from "viem";
import { base } from "wagmi/chains";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  usePublicClient,
  useReadContract,
  useSignMessage,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { SoulboundHoldersList } from "@/components/SoulboundHoldersList";

const DEFAULT_TIPJAR = "0x47ad142c4f04431164737cACD601796932b7357A";
const TIPJAR_ABI = [
  {
    type: "event",
    name: "TipReceived",
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address", internalType: "address" },
      { indexed: false, name: "amount", type: "uint256", internalType: "uint256" },
      { indexed: false, name: "message", type: "string", internalType: "string" },
    ],
  },
  {
    type: "function",
    name: "tip",
    stateMutability: "payable",
    inputs: [{ name: "message", type: "string", internalType: "string" }],
    outputs: [],
  },
] as const;

const SBT_ABI = [
  {
    type: "function",
    name: "hasBadge",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "bool", internalType: "bool" }],
  },
] as const;

type TipActivityItem = {
  id: string;
  from: `0x${string}`;
  amount: string;
  message: string;
  txHash: `0x${string}`;
  blockNumber: bigint;
};

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
  const [lastSentTip, setLastSentTip] = useState<{
    amountEth: string;
    message: string;
    submittedAt: number;
  } | null>(null);
  const [tipActivity, setTipActivity] = useState<TipActivityItem[]>([]);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<string | null>(null);
  const autoSwitchTriedRef = useRef(false);
  const lastScannedBlockRef = useRef<bigint | null>(null);

  const tipJarAddress = process.env.NEXT_PUBLIC_TIPJAR_ADDRESS || DEFAULT_TIPJAR;
  const sbtAddress = process.env.NEXT_PUBLIC_SBT_ADDRESS;
  const hasValidSbtAddress =
    typeof sbtAddress === "string" && /^0x[a-fA-F0-9]{40}$/.test(sbtAddress);
  const isOnBase = chainId === base.id;
  const tipPresets = ["0.0005", "0.0010", "0.0050"];
  const messagePresets = ["gm base", "LFG", "great build", "ship it", "based app"];
  const { data: hasBadgeOnchain } = useReadContract({
    address: hasValidSbtAddress ? (sbtAddress as `0x${string}`) : undefined,
    abi: SBT_ABI,
    functionName: "hasBadge",
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && hasValidSbtAddress),
    },
  });

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
      .then(() => setNetworkStatus("Network automatically switched to Base."))
      .catch(() =>
        setNetworkStatus("Auto-switch failed. Click Switch to Base and approve in your wallet.")
      );
  }, [isConnected, isOnBase, isSwitchingChain, switchChainAsync]);

  useEffect(() => {
    if (!publicClient) return;

    let cancelled = false;
    const tipEvent = parseAbiItem("event TipReceived(address indexed from, uint256 amount, string message)");

    async function loadRecentTips() {
      try {
        const latestBlock = await publicClient.getBlockNumber();
        const fallbackFromBlock =
          latestBlock > BigInt(1200) ? latestBlock - BigInt(1200) : BigInt(0);
        const fromBlock = lastScannedBlockRef.current
          ? lastScannedBlockRef.current + BigInt(1)
          : fallbackFromBlock;
        if (fromBlock > latestBlock) return;

        const logs = await publicClient.getLogs({
          address: tipJarAddress as `0x${string}`,
          event: tipEvent,
          fromBlock,
          toBlock: latestBlock,
        });

        if (cancelled) return;

        const mapped = logs
          .map((log) => {
            const args = log.args as { from?: `0x${string}`; amount?: bigint; message?: string };
            if (!args.from || args.amount === undefined || !log.transactionHash) return null;
            const hash = log.transactionHash;
            return {
              id: `${hash}-${log.logIndex?.toString() ?? "0"}`,
              from: args.from,
              amount: Number(formatEther(args.amount)).toFixed(6),
              message: args.message?.trim() ? args.message : "(no message)",
              txHash: hash,
              blockNumber: log.blockNumber ?? BigInt(0),
            };
          })
          .filter((entry): entry is TipActivityItem => entry !== null);

        if (mapped.length > 0) {
          setTipActivity((prev) => {
            const unique = new Map<string, TipActivityItem>();
            [...mapped, ...prev].forEach((entry) => unique.set(entry.id, entry));
            return Array.from(unique.values())
              .sort((a, b) => (a.blockNumber === b.blockNumber ? 0 : a.blockNumber > b.blockNumber ? -1 : 1))
              .slice(0, 8);
          });
        }

        lastScannedBlockRef.current = latestBlock;
        setActivityError(null);
      } catch {
        if (!cancelled) {
          setActivityError("Unable to load live activity. Check RPC and try again.");
        }
      }
    }

    void loadRecentTips();
    const timer = setInterval(() => {
      void loadRecentTips();
    }, 12000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [publicClient, tipJarAddress]);

  async function handleSiwe() {
    setSiweError(null);
    setSiweOk(false);

    if (!isConnected || !address || !chainId || !publicClient) {
      setSiweError("Connect your wallet before SIWE.");
      return;
    }
    if (!isOnBase) {
      setSiweError("Switch your wallet network to Base first.");
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
        setSiweError("SIWE signature verification failed.");
        return;
      }

      setSiweOk(true);
    } catch {
      setSiweError("SIWE failed. Please try again.");
    }
  }

  function handleTip() {
    setTipStatus(null);
    try {
      if (!isOnBase) {
        setTipStatus("Switch network to Base first.");
        return;
      }
      const value = parseEther(tipEth || "0");
      if (value <= BigInt(0)) {
        setTipStatus("Tip amount must be greater than 0.");
        return;
      }
      const normalizedMessage = tipMessage.trim() || "Support Base Tip app";
      setLastSentTip({
        amountEth: tipEth,
        message: normalizedMessage,
        submittedAt: Date.now(),
      });

      writeContract({
        address: tipJarAddress as `0x${string}`,
        chainId: base.id,
        abi: TIPJAR_ABI,
        functionName: "tip",
        args: [normalizedMessage],
        value,
      });
      setTipStatus("TipJar transaction is being sent on Base...");
    } catch {
      setTipStatus("Invalid tip amount.");
    }
  }

  async function handleSwitchToBase() {
    setNetworkStatus(null);
    try {
      await switchChainAsync({ chainId: base.id });
      setNetworkStatus("Network switched to Base.");
    } catch {
      setNetworkStatus("Unable to switch network. Approve the network change in your wallet.");
    }
  }

  async function handleShareReceipt() {
    if (!txHash || !lastSentTip) return;

    const txUrl = `https://basescan.org/tx/${txHash}`;
    const shareText = `Just tipped ${lastSentTip.amountEth} ETH on Base Tip.\n"${lastSentTip.message}"\n${txUrl}`;

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: "Base Tip receipt",
          text: shareText,
          url: txUrl,
        });
        return;
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setTipStatus("Receipt copied to clipboard.");
      }
    } catch {
      setTipStatus("Unable to share receipt. Please try again.");
    }
  }

  const badgeUnlocked = Boolean(hasBadgeOnchain) || txConfirmed;

  return (
    <section className="relative z-10 w-full max-w-3xl rounded-3xl border border-white/15 bg-black/45 p-5 text-white shadow-[0_0_50px_rgba(76,29,149,0.45)] backdrop-blur-xl">
      <h1 className="text-3xl font-black text-fuchsia-200 md:text-5xl">Base Tip</h1>

      <div className="mt-5 grid gap-3 rounded-2xl border border-cyan-300/30 bg-slate-950/50 p-4">
        <p className="text-sm text-cyan-100">Wallet: <span className="font-bold">{shortAddress}</span></p>
        <p className="text-sm text-cyan-100">
          Network:{" "}
          <span className="font-bold">
            {chainId ? `${chainId}${isOnBase ? " (Base)" : " (wrong network)"}` : "—"}
          </span>
        </p>
        <p className="text-sm text-cyan-100">
          Balance:{" "}
          <span className="font-bold">
            {balance ? `${Number(formatEther(balance.value)).toFixed(4)} ETH` : "—"}
          </span>
        </p>
        {address && sbtAddress ? (
          <a
            href={`https://basescan.org/token/${sbtAddress}?a=${address}`}
            target="_blank"
            rel="noreferrer"
            className="w-fit rounded-lg border border-violet-300/35 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-200"
          >
            View my badge
          </a>
        ) : null}

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
          {tipPresets.map((preset) => (
            <button
              key={preset}
              onClick={() => setTipEth(preset)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                tipEth === preset
                  ? "border-emerald-200/80 bg-emerald-400/30 text-emerald-100"
                  : "border-emerald-200/30 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {preset} ETH
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {messagePresets.map((preset) => (
            <button
              key={preset}
              onClick={() => setTipMessage(preset)}
              className="rounded-lg border border-fuchsia-200/30 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-bold text-fuchsia-200 transition hover:bg-fuchsia-500/20"
            >
              {preset}
            </button>
          ))}
        </div>
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
        {txHash && lastSentTip ? (
          <div className="rounded-2xl border border-emerald-200/30 bg-emerald-950/30 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Onchain Receipt</p>
            <p className="mt-2 text-sm text-emerald-100">
              Amount: <span className="font-bold">{lastSentTip.amountEth} ETH</span>
            </p>
            <p className="text-sm text-emerald-100">
              Message: <span className="font-bold">{lastSentTip.message}</span>
            </p>
            <p className="text-sm text-emerald-100">
              Status:{" "}
              <span className={`font-bold ${txConfirmed ? "text-emerald-300" : "text-amber-200"}`}>
                {txConfirmed ? "Confirmed on Base" : "Pending confirmation"}
              </span>
            </p>
            {txConfirmed ? (
              <div className="mt-2 rounded-lg border border-emerald-200/40 bg-emerald-400/15 p-2 text-xs font-bold text-emerald-100 animate-pulse">
                ✨ Success! Your tip is final onchain.
              </div>
            ) : null}
            <p className="text-xs text-emerald-200/90">
              Sent: {new Date(lastSentTip.submittedAt).toLocaleString()}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-cyan-300/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-200"
              >
                Open BaseScan
              </a>
              <button
                onClick={handleShareReceipt}
                className="rounded-lg border border-fuchsia-300/40 bg-fuchsia-500/20 px-3 py-1.5 text-xs font-bold text-fuchsia-200"
              >
                Share receipt
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-sky-300/30 bg-slate-950/50 p-4">
        <h2 className="text-xl font-black text-sky-200">Live tip activity</h2>
        <p className="text-sm text-sky-100/90">Latest onchain tip events from TipJar.</p>
        {activityError ? <p className="text-sm text-rose-300">{activityError}</p> : null}
        {tipActivity.length === 0 ? (
          <p className="text-sm text-sky-100/90">No events yet, or they are still loading.</p>
        ) : (
          <div className="grid gap-2">
            {tipActivity.map((item) => (
              <div key={item.id} className="rounded-xl border border-sky-200/20 bg-sky-950/25 p-3 text-sm">
                <p className="text-sky-100">
                  <span className="font-bold text-sky-200">{item.amount} ETH</span> from{" "}
                  <span className="font-bold">{item.from.slice(0, 6)}...{item.from.slice(-4)}</span>
                </p>
                <p className="text-sky-100/90">{item.message}</p>
                <a
                  href={`https://basescan.org/tx/${item.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-cyan-300 underline"
                >
                  {item.txHash.slice(0, 10)}...{item.txHash.slice(-8)}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-amber-300/30 bg-slate-950/50 p-4">
        <h2 className="text-xl font-black text-amber-200">Collector badge</h2>
        <p className="text-sm text-amber-100/90">Unlock this badge after your first confirmed onchain tip.</p>
        <div
          className={`rounded-xl border p-3 ${
            badgeUnlocked
              ? "animate-pulse border-amber-200/70 bg-amber-500/20 text-amber-100"
              : "border-amber-200/20 bg-amber-500/5 text-amber-100/80"
          }`}
        >
          {badgeUnlocked ? "🏅 Base Supporter unlocked" : "🔒 Base Supporter locked"}
        </div>
      </div>

      <SoulboundHoldersList
        key={`${process.env.NEXT_PUBLIC_SBT_ADDRESS ?? ""}-${process.env.NEXT_PUBLIC_SBT_FROM_BLOCK ?? ""}`}
      />
    </section>
  );
}
