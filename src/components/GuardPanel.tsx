"use client";

import { useMemo, useState } from "react";
import { formatUnits, getAddress, isAddress } from "viem";
import { useAccount, useChainId, useConnect, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { OsAddressDisplay } from "@/components/os/OsAddressDisplay";
import { BASE_CHAIN_ID } from "@/lib/baseChain";
import { useFlashblocksReceipt } from "@/hooks/useFlashblocksReceipt";
import { connectorButtonLabel, pickPreferredConnector } from "@/lib/walletConnectors";
import { parseAddressSearchParam } from "@/lib/osUrlParams";

const REVOKE_CASH_BASE = "https://revoke.cash/chain/8453";

/** Native USDC on Base (official listing). */
const PRESET_USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as const;
/** Uniswap Universal Router on Base (common swap approvals). */
const PRESET_SPENDER_UNIV2 = "0x6Ff5693B99212DA76Ad316177a184Ab56d299b43" as const;

const ERC20_ABI = [
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

/** Treat huge allowances as practically unlimited approvals. */
const HUGE_ALLOWANCE = BigInt(10) ** BigInt(40);

export function GuardPanel({ initialAddress = null }: { initialAddress?: string | null }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const preferredConnector = useMemo(() => pickPreferredConnector(connectors), [connectors]);
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const {
    writeContract: revoke,
    data: revokeHash,
    isPending: isRevoking,
    error: revokeError,
    reset: resetRevoke,
  } = useWriteContract();
  const { isLoading: isRevokeConfirming, isSuccess: revokeConfirmed } =
    useFlashblocksReceipt(revokeHash);
  const [tokenInput, setTokenInput] = useState<string>(PRESET_USDC);
  const [spenderInput, setSpenderInput] = useState("");

  const targetChecksum = useMemo(() => {
    const raw = initialAddress?.trim();
    if (!raw) return null;
    return parseAddressSearchParam(raw);
  }, [initialAddress]);

  const checksumToken = useMemo(() => normalizeAddress(tokenInput), [tokenInput]);
  const checksumSpender = useMemo(() => normalizeAddress(spenderInput), [spenderInput]);

  const isBase = chainId === BASE_CHAIN_ID;
  const validInputs =
    Boolean(isConnected && isBase && address && checksumToken && checksumSpender);

  const decimalsQuery = useReadContract({
    address: checksumToken ?? undefined,
    abi: ERC20_ABI,
    functionName: "decimals",
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: Boolean(checksumToken && isConnected && isBase),
    },
  });

  const symbolQuery = useReadContract({
    address: checksumToken ?? undefined,
    abi: ERC20_ABI,
    functionName: "symbol",
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: Boolean(checksumToken && isConnected && isBase),
    },
  });

  const allowanceQuery = useReadContract({
    address: checksumToken ?? undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && checksumSpender ? [address, checksumSpender] : undefined,
    chainId: BASE_CHAIN_ID,
    query: {
      enabled: validInputs,
    },
  });

  function presetUsdcUni() {
    setTokenInput(PRESET_USDC);
    setSpenderInput(PRESET_SPENDER_UNIV2);
  }

  const decimalsRaw = decimalsQuery.data;
  const decimals =
    decimalsRaw !== undefined ? Number(decimalsRaw) : undefined;
  const symbol = typeof symbolQuery.data === "string" ? symbolQuery.data : null;

  let allowanceText = "Add token and app addresses. Amount appears when both are valid.";
  if (allowanceQuery.isFetching) allowanceText = "Loading…";
  else if (decimalsQuery.isError || symbolQuery.isError || allowanceQuery.isError)
    allowanceText = "Couldn’t read this token. Check it’s a normal token on Base.";
  else if (
    allowanceQuery.data !== undefined &&
    decimals !== undefined &&
    Number.isFinite(decimals) &&
    decimals >= 0 &&
    decimals <= 36
  ) {
    const sym = symbol ?? "TOKEN";
    const raw = allowanceQuery.data as bigint;
    allowanceText = `${formatUnits(raw, decimals)} ${sym}`;
    if (raw >= HUGE_ALLOWANCE) allowanceText += " (very high — like unlimited)";
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="os-panel p-6">
        <p className="os-eyebrow text-emerald-200/90">Safety</p>
        <h2 className="os-display mt-2 text-3xl font-semibold text-white">Wallet guard</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-200/85">
          See how much a contract can spend — and <span className="text-emerald-200">revoke</span> access
          in one click. Stay safe on Base without leaving Base OS.
        </p>

        {targetChecksum ? (
          <div className="mt-4 rounded-2xl border border-cyan-300/25 bg-cyan-500/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-200/90">Deep link wallet</p>
            <OsAddressDisplay
              address={targetChecksum}
              monoClassName="mt-1 break-all font-mono text-sm font-bold text-white"
            />
            {isConnected && address?.toLowerCase() !== targetChecksum.toLowerCase() ? (
              <p className="mt-2 text-sm text-amber-100">
                Connected wallet differs — connect the target wallet to revoke here, or use revoke.cash.
              </p>
            ) : !isConnected ? (
              <p className="mt-2 text-sm text-cyan-100/90">
                Connect the wallet above to revoke approvals in Base OS.
              </p>
            ) : null}
            <a
              href={`https://revoke.cash/address/${targetChecksum}?chainId=8453`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-xl border border-cyan-200/40 bg-cyan-500/20 px-4 py-2 text-sm font-bold text-cyan-50"
            >
              Bulk review on revoke.cash ↗
            </a>
          </div>
        ) : null}

        {!isConnected ? (
          <div className="mt-6 rounded-2xl border border-amber-300/25 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-100">Connect your wallet (Base) to check permissions.</p>
            <button
              type="button"
              disabled={isConnecting || !preferredConnector}
              onClick={() =>
                preferredConnector &&
                connect({ connector: preferredConnector, chainId: BASE_CHAIN_ID })
              }
              className="mt-3 rounded-xl border border-amber-200/40 bg-amber-500/20 px-4 py-2 text-sm font-bold text-amber-100 disabled:opacity-40"
            >
              {connectorButtonLabel(preferredConnector, isConnecting)}
            </button>
          </div>
        ) : !isBase ? (
          <div className="mt-6 rounded-2xl border border-fuchsia-300/25 bg-fuchsia-500/10 p-4">
            <p className="text-sm text-fuchsia-100">Switch to the Base network to continue.</p>
            <button
              type="button"
              disabled={isSwitching}
              onClick={() => void switchChainAsync({ chainId: BASE_CHAIN_ID })}
              className="mt-3 rounded-xl border border-fuchsia-200/40 bg-fuchsia-500/20 px-4 py-2 text-sm font-bold text-fuchsia-100"
            >
              Switch to Base
            </button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {address ? (
              <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Your wallet</p>
                <OsAddressDisplay address={address} className="mt-1" />
              </div>
            ) : null}
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Token</span>
              <input
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value.trim())}
                placeholder={PRESET_USDC}
                spellCheck={false}
                className="os-input mt-2 font-mono outline-none focus:border-emerald-400/40"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">App / contract</span>
              <input
                value={spenderInput}
                onChange={(e) => setSpenderInput(e.target.value.trim())}
                spellCheck={false}
                placeholder="0x…"
                className="os-input mt-2 font-mono outline-none focus:border-emerald-400/40"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => presetUsdcUni()}
                className="rounded-xl border border-white/15 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-100"
              >
                USDC + Uniswap (example)
              </button>
              <button
                type="button"
                disabled={!validInputs || allowanceQuery.isFetching}
                onClick={() => void allowanceQuery.refetch()}
                className="rounded-xl border border-cyan-300/40 bg-cyan-500/20 px-4 py-2 text-sm font-bold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Refresh
              </button>
            </div>
            {!checksumToken || !checksumSpender ? (
              <p className="text-xs text-slate-500">Use full addresses (0x + 40 characters).</p>
            ) : null}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">Allowed amount</p>
              <p className="mt-2 break-all font-mono text-sm font-bold text-white">{allowanceText}</p>
              {validInputs &&
              allowanceQuery.data !== undefined &&
              (allowanceQuery.data as bigint) > BigInt(0) ? (
                <button
                  type="button"
                  disabled={isRevoking || isRevokeConfirming}
                  onClick={() => {
                    resetRevoke();
                    revoke({
                      address: checksumToken!,
                      abi: ERC20_ABI,
                      functionName: "approve",
                      args: [checksumSpender!, BigInt(0)],
                      chainId: BASE_CHAIN_ID,
                    });
                  }}
                  className="mt-3 w-full rounded-xl border border-rose-400/40 bg-rose-500/15 py-2.5 text-sm font-black text-rose-100 disabled:opacity-40"
                >
                  {isRevoking || isRevokeConfirming ? "Revoking…" : "Revoke access (set to 0)"}
                </button>
              ) : null}
              {revokeConfirmed ? (
                <p className="mt-2 text-xs font-bold text-emerald-300">Revoked — refresh to confirm.</p>
              ) : null}
              {revokeError ? (
                <p className="mt-2 text-xs text-rose-400">{revokeError.message}</p>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <aside className="grid content-start gap-4">
        <div className="os-panel border-emerald-400/20 p-5">
          <h3 className="font-black text-emerald-100">Advanced revoke</h3>
          <p className="mt-2 text-sm text-emerald-100/90">Bulk review on revoke.cash for all tokens.</p>
          <a
            href={REVOKE_CASH_BASE}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex rounded-xl border border-emerald-200/50 bg-emerald-500/20 px-4 py-2 text-sm font-bold text-emerald-50"
          >
            Open revoke.cash ↗
          </a>
        </div>
        <div className="os-panel p-5 text-sm text-slate-300">
          <p className="font-bold text-white">Hints</p>
          <ul className="mt-2 list-disc space-y-2 pl-4">
            <li>The “app” address often comes from your approve transaction on BaseScan.</li>
            <li>Revoke sets allowance to zero — the app can no longer pull tokens.</li>
            <li>For unlimited approvals, prefer revoking then re-approve a limited amount.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

function normalizeAddress(raw: string): `0x${string}` | null {
  try {
    if (!raw.startsWith("0x") || !isAddress(raw)) return null;
    return getAddress(raw);
  } catch {
    return null;
  }
}
