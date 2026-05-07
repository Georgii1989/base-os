"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createSiweMessage, generateSiweNonce } from "viem/siwe";
import { formatEther, parseAbiItem, parseEther, type AbiEvent } from "viem";
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

/** Chunked getLogs + retries — public RPC often drops large/rare requests. */
const ACTIVITY_LOG_CHUNK = BigInt(450);
const LIVE_TIP_EVENT_ABI = parseAbiItem(
  "event TipReceived(address indexed from, uint256 amount, string message)"
) as AbiEvent;

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

  const tipJarAddress = process.env.NEXT_PUBLIC_TIPJAR_ADDRESS || DEFAULT_TIPJAR;
  const sbtAddress = process.env.NEXT_PUBLIC_SBT_ADDRESS;
  const hasValidSbtAddress =
    typeof sbtAddress === "string" && /^0x[a-fA-F0-9]{40}$/.test(sbtAddress);
  const isOnBase = chainId === base.id;

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
  const [activitySoftHint, setActivitySoftHint] = useState<string | null>(null);
  const [activityExpanded, setActivityExpanded] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<string | null>(null);
  const autoSwitchTriedRef = useRef(false);
  /** Monotonic gate so overlapping polls cannot regress lastScannedBlockRef or stale UI updates. */
  const activityLoadGenRef = useRef(0);
  const lastScannedBlockRef = useRef<bigint | null>(null);
  const tipJarKeyRef = useRef(tipJarAddress);
  const tipActivityRef = useRef<TipActivityItem[]>([]);

  useEffect(() => {
    tipActivityRef.current = tipActivity;
  }, [tipActivity]);

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
      .then(() => setNetworkStatus("Switched to Base."))
      .catch(() =>
        setNetworkStatus("Could not switch automatically. Tap “Switch to Base”.")
      );
  }, [isConnected, isOnBase, isSwitchingChain, switchChainAsync]);

  useEffect(() => {
    if (!publicClient) return;

    if (tipJarKeyRef.current !== tipJarAddress) {
      tipJarKeyRef.current = tipJarAddress;
      lastScannedBlockRef.current = null;
      activityLoadGenRef.current += 1;
    }

    let cancelled = false;

    async function getLogsWithRetries(fromBlock: bigint, toBlock: bigint) {
      const contract = tipJarAddress as `0x${string}`;
      const out: Awaited<ReturnType<typeof publicClient.getLogs>> = [];
      let cursor = fromBlock;
      while (cursor <= toBlock) {
        const end =
          cursor + ACTIVITY_LOG_CHUNK - BigInt(1) > toBlock ? toBlock : cursor + ACTIVITY_LOG_CHUNK - BigInt(1);
        let ok = false;
        for (let attempt = 0; attempt < 3 && !ok; attempt++) {
          try {
            const chunk = await publicClient.getLogs({
              address: contract,
              event: LIVE_TIP_EVENT_ABI,
              fromBlock: cursor,
              toBlock: end,
            });
            out.push(...chunk);
            ok = true;
          } catch {
            await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
          }
        }
        if (!ok) {
          throw new Error("activity-rpc-chunk-failed");
        }
        cursor = end + BigInt(1);
      }
      return out;
    }

    async function loadRecentTips() {
      const gen = ++activityLoadGenRef.current;

      function isStale() {
        return cancelled || gen !== activityLoadGenRef.current;
      }

      try {
        const latestBlock = await publicClient.getBlockNumber();
        if (isStale()) return;

        const fallbackFromBlock =
          latestBlock > BigInt(1200) ? latestBlock - BigInt(1200) : BigInt(0);
        const fromBlock = lastScannedBlockRef.current
          ? lastScannedBlockRef.current + BigInt(1)
          : fallbackFromBlock;
        if (fromBlock > latestBlock) {
          return;
        }

        const logs = await getLogsWithRetries(fromBlock, latestBlock);

        if (isStale()) {
          return;
        }

        const mapped = logs
          .map((log) => {
            const row = log as {
              transactionHash?: `0x${string}` | null;
              logIndex?: number | null;
              blockNumber?: bigint | null;
              args?: { from?: `0x${string}`; amount?: bigint; message?: string };
            };
            const args = row.args ?? {};
            if (!args.from || args.amount === undefined || !row.transactionHash) return null;
            const hash = row.transactionHash;
            return {
              id: `${hash}-${row.logIndex?.toString() ?? "0"}`,
              from: args.from,
              amount: Number(formatEther(args.amount)).toFixed(6),
              message: args.message?.trim() ? args.message : "(no message)",
              txHash: hash,
              blockNumber: row.blockNumber ?? BigInt(0),
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
        setActivitySoftHint(null);
      } catch {
        if (!isStale()) {
          if (tipActivityRef.current.length === 0) {
            setActivityError("Couldn’t load tips. Check your connection and try again.");
            setActivitySoftHint(null);
          } else {
            setActivityError(null);
            setActivitySoftHint("Couldn’t refresh — showing the last tips we got.");
          }
        }
      }
    }

    void loadRecentTips();
    const timer = setInterval(() => {
      void loadRecentTips();
    }, 12000);

    return () => {
      cancelled = true;
      activityLoadGenRef.current += 1;
      clearInterval(timer);
    };
  }, [publicClient, tipJarAddress]);

  async function handleSiwe() {
    setSiweError(null);
    setSiweOk(false);

    if (!isConnected || !address || !chainId || !publicClient) {
      setSiweError("Connect your wallet first.");
      return;
    }
    if (!isOnBase) {
      setSiweError("Switch to Base in your wallet first.");
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
        setSiweError("Signature didn’t verify. Try again.");
        return;
      }

      setSiweOk(true);
    } catch {
      setSiweError("Sign-in failed. Try again.");
    }
  }

  function handleTip() {
    setTipStatus(null);
    try {
      if (!isOnBase) {
        setTipStatus("Switch to Base first.");
        return;
      }
      const value = parseEther(tipEth || "0");
      if (value <= BigInt(0)) {
        setTipStatus("Enter an amount greater than 0.");
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
      setTipStatus("Sending…");
    } catch {
      setTipStatus("That amount doesn’t look valid.");
    }
  }

  async function handleSwitchToBase() {
    setNetworkStatus(null);
    try {
      await switchChainAsync({ chainId: base.id });
      setNetworkStatus("Now on Base.");
    } catch {
      setNetworkStatus("Approve the network change in your wallet.");
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
            {chainId ? `${chainId}${isOnBase ? " (Base)" : " (not Base)"}` : "—"}
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
        <h2 className="text-xl font-black text-fuchsia-200">Sign in (Ethereum)</h2>
        <button
          onClick={handleSiwe}
          disabled={!isConnected}
          className="w-fit rounded-xl bg-fuchsia-500/85 px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {siweOk ? "Signed in" : "Sign message"}
        </button>
        {siweError ? <p className="text-sm text-rose-300">{siweError}</p> : null}
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-emerald-300/30 bg-slate-950/50 p-4">
        <h2 className="text-xl font-black text-emerald-200">Send a tip</h2>
        <p className="text-sm text-emerald-100/90">Tip address: {tipJarAddress}</p>
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
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Receipt</p>
            <p className="mt-2 text-sm text-emerald-100">
              Amount: <span className="font-bold">{lastSentTip.amountEth} ETH</span>
            </p>
            <p className="text-sm text-emerald-100">
              Message: <span className="font-bold">{lastSentTip.message}</span>
            </p>
            <p className="text-sm text-emerald-100">
              Status:{" "}
              <span className={`font-bold ${txConfirmed ? "text-emerald-300" : "text-amber-200"}`}>
                {txConfirmed ? "Confirmed on Base" : "Waiting for confirmation"}
              </span>
            </p>
            {txConfirmed ? (
              <div className="mt-2 rounded-lg border border-emerald-200/40 bg-emerald-400/15 p-2 text-xs font-bold text-emerald-100 animate-pulse">
                ✓ Tip received on Base.
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
        <button
          type="button"
          onClick={() => setActivityExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-sky-200/30 bg-sky-500/10 px-3 py-2 text-left"
        >
          <div>
            <h2 className="text-xl font-black text-sky-200">Recent tips</h2>
            <p className="text-sm text-sky-100/90">
              From the tip jar. {activityExpanded ? "Tap to hide." : "Tap to show."}
            </p>
          </div>
          <span className="text-lg font-black text-sky-200">{activityExpanded ? "▲" : "▼"}</span>
        </button>

        {activityExpanded ? (
          <>
            {activityError ? <p className="text-sm text-rose-300">{activityError}</p> : null}
            {activitySoftHint ? <p className="text-sm text-amber-200/95">{activitySoftHint}</p> : null}
            {tipActivity.length === 0 ? (
              <p className="text-sm text-sky-100/90">Nothing here yet.</p>
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
          </>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-amber-300/30 bg-slate-950/50 p-4">
        <h2 className="text-xl font-black text-amber-200">Supporter badge</h2>
        <p className="text-sm text-amber-100/90">You get this after your first confirmed tip.</p>
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
