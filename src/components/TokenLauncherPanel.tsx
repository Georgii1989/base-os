"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { decodeEventLog, formatUnits, isAddress, parseUnits } from "viem";
import { base } from "wagmi/chains";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { TOKEN_FACTORY_ABI, TOKEN_LAUNCHED_EVENT } from "@/lib/tokenFactoryAbi";
import { validateTokenLaunchForm } from "@/lib/tokenLaunchValidate";
import { shortenAddressDisplay } from "@/lib/knownBaseProtocols";

export function TokenLauncherPanel() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: base.id });
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const factoryRaw = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS?.trim();
  const factoryAddress =
    factoryRaw && isAddress(factoryRaw) ? (factoryRaw as `0x${string}`) : undefined;

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [supplyWhole, setSupplyWhole] = useState("1000000");
  const [formError, setFormError] = useState<string | null>(null);
  const [launchedToken, setLaunchedToken] = useState<`0x${string}` | null>(null);
  const [launchedMeta, setLaunchedMeta] = useState<{
    name: string;
    symbol: string;
    supplyFormatted: string;
  } | null>(null);

  const isOnBase = chainId === base.id;

  const {
    data: txHash,
    isPending: isLaunching,
    error: launchError,
    writeContract,
    reset: resetLaunch,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: txConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    if (!txConfirmed || !txHash || !publicClient || !factoryAddress) return;

    let cancelled = false;

    (async () => {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
      if (cancelled) return;

      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== factoryAddress.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({
            abi: [TOKEN_LAUNCHED_EVENT],
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "TokenLaunched") {
            setLaunchedToken(decoded.args.token as `0x${string}`);
            setLaunchedMeta({
              name: decoded.args.name as string,
              symbol: decoded.args.symbol as string,
              supplyFormatted: formatUnits(decoded.args.initialSupply as bigint, 18),
            });
            return;
          }
        } catch {
          /* not our event */
        }
      }
    })().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [txConfirmed, txHash, publicClient, factoryAddress]);

  const validation = useMemo(
    () => validateTokenLaunchForm({ name, symbol, supplyWhole }),
    [name, symbol, supplyWhole]
  );

  function handleLaunch() {
    setFormError(null);
    setLaunchedToken(null);
    setLaunchedMeta(null);

    if (!factoryAddress) {
      setFormError("Token factory is not configured on this deployment.");
      return;
    }
    if (!isConnected || !address) {
      setFormError("Connect a wallet first.");
      return;
    }
    if (!isOnBase) {
      setFormError("Switch to Base network.");
      return;
    }
    if (!validation.ok) {
      setFormError(validation.error);
      return;
    }

    let initialSupply: bigint;
    try {
      initialSupply = parseUnits(validation.supplyWhole, 18);
    } catch {
      setFormError("Could not parse supply.");
      return;
    }

    resetLaunch();
    writeContract({
      address: factoryAddress,
      abi: TOKEN_FACTORY_ABI,
      functionName: "launch",
      args: [validation.name, validation.symbol, initialSupply],
    });
  }

  if (!factoryAddress) {
    return (
      <section className="rounded-3xl border border-amber-300/30 bg-amber-500/10 p-6 text-amber-100">
        <h2 className="text-xl font-black text-white">Launch token</h2>
        <p className="mt-3 text-sm text-amber-100/90">
          Deploy <span className="font-mono">TokenFactory</span> on Base, then set{" "}
          <span className="font-mono">NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS</span> in env. Run:{" "}
          <span className="font-mono">npm run contract:compile:hardhat</span> then{" "}
          <span className="font-mono">npm run contract:deploy:factory</span>.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border border-cyan-300/25 bg-gradient-to-br from-cyan-500/10 via-slate-950/60 to-emerald-500/10 p-6 md:p-8">
        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-cyan-200/90">
          Launch
        </p>
        <h2 className="mt-2 text-3xl font-black text-white">Create your token on Base</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          Standard ERC-20 (18 decimals). Full supply is minted to your wallet. You pay gas in ETH
          on Base — typically a few cents. No liquidity pool or listing is created.
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
              Name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Base Token"
              maxLength={32}
              className="mt-2 w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 text-white outline-none focus:border-cyan-300/50"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
              Symbol
            </span>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="MBT"
              maxLength={11}
              className="mt-2 w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 font-mono text-white uppercase outline-none focus:border-cyan-300/50"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">
              Initial supply (whole tokens)
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={supplyWhole}
              onChange={(e) => setSupplyWhole(e.target.value)}
              placeholder="1000000"
              className="mt-2 w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 font-mono text-white outline-none focus:border-cyan-300/50"
            />
            <p className="mt-1 text-xs text-slate-500">18 decimals — e.g. 1,000,000 = 1M tokens.</p>
          </label>
        </div>

        {isConnected && address ? (
          <p className="mt-4 text-sm text-slate-400">
            Recipient: <span className="font-mono font-bold text-cyan-200">{shortenAddressDisplay(address)}</span>
          </p>
        ) : (
          <p className="mt-4 text-sm text-amber-200">Connect a wallet to launch.</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {!isOnBase && isConnected ? (
            <button
              type="button"
              disabled={isSwitchingChain}
              onClick={() => switchChainAsync({ chainId: base.id })}
              className="rounded-xl border border-amber-300/40 bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-100"
            >
              {isSwitchingChain ? "Switching…" : "Switch to Base"}
            </button>
          ) : null}
          <button
            type="button"
            disabled={!isConnected || !isOnBase || isLaunching || isConfirming}
            onClick={handleLaunch}
            className="rounded-xl bg-gradient-to-r from-cyan-500/80 to-emerald-500/70 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
          >
            {isLaunching || isConfirming ? "Confirm in wallet…" : "Launch on Base"}
          </button>
        </div>

        {formError ? <p className="mt-3 text-sm text-rose-300">{formError}</p> : null}
        {launchError ? (
          <p className="mt-3 text-sm text-rose-300">
            {"shortMessage" in launchError && typeof launchError.shortMessage === "string"
              ? launchError.shortMessage
              : launchError.message}
          </p>
        ) : null}

        {txHash ? (
          <p className="mt-3 text-sm text-slate-400">
            Tx:{" "}
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-cyan-300 hover:underline"
            >
              {txHash.slice(0, 12)}…
            </a>
            {txConfirmed ? " · confirmed" : " · confirming"}
          </p>
        ) : null}
      </section>

      {launchedToken && launchedMeta ? (
        <section className="rounded-3xl border border-emerald-300/35 bg-emerald-500/10 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200/90">
            Token live
          </p>
          <h3 className="mt-1 text-2xl font-black text-white">
            {launchedMeta.name}{" "}
            <span className="font-mono text-emerald-200">({launchedMeta.symbol})</span>
          </h3>
          <p className="mt-2 break-all font-mono text-sm text-emerald-100">{launchedToken}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`https://basescan.org/token/${launchedToken}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-emerald-300/40 px-4 py-2 text-sm font-bold text-emerald-100"
            >
              View on BaseScan ↗
            </a>
            {address ? (
              <Link
                href={`/card/${address}`}
                className="rounded-xl border border-cyan-300/35 px-4 py-2 text-sm font-bold text-cyan-100"
              >
                Your identity card ↗
              </Link>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Import in wallet: contract address above · decimals 18 · minted{" "}
            {launchedMeta.supplyFormatted} tokens to your wallet.
          </p>
        </section>
      ) : null}

      <p className="text-xs text-slate-600">
        Not financial advice. Anyone can deploy tokens with any name — verify contract address
        before trading.
      </p>
    </div>
  );
}
