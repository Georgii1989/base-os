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
import {
  canAdvanceFromStep,
  LAUNCH_KIT_STEPS,
  launchStepIndex,
  nextLaunchStep,
  prevLaunchStep,
  type LaunchKitStepId,
} from "@/lib/launchKitSteps";
import { validateTokenLaunchForm } from "@/lib/tokenLaunchValidate";
import { shortenAddressDisplay } from "@/lib/knownBaseProtocols";

function StepIndicator({ step }: { step: LaunchKitStepId }) {
  const current = launchStepIndex(step);
  return (
    <ol className="flex flex-wrap gap-2">
      {LAUNCH_KIT_STEPS.slice(0, -1).map((s, i) => {
        const done = i < current;
        const active = s.id === step;
        return (
          <li
            key={s.id}
            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
              active
                ? "bg-cyan-500/30 text-cyan-100 ring-1 ring-cyan-300/40"
                : done
                  ? "bg-emerald-500/15 text-emerald-200"
                  : "bg-white/5 text-slate-500"
            }`}
          >
            {i + 1}. {s.label}
          </li>
        );
      })}
    </ol>
  );
}

export function TokenLauncherPanel() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: base.id });
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const factoryRaw = process.env.NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS?.trim();
  const factoryAddress =
    factoryRaw && isAddress(factoryRaw) ? (factoryRaw as `0x${string}`) : undefined;

  const [step, setStep] = useState<LaunchKitStepId>("intro");
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
  const form = useMemo(() => ({ name, symbol, supplyWhole }), [name, symbol, supplyWhole]);
  const validation = useMemo(() => validateTokenLaunchForm(form), [form]);

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
            setStep("success");
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

  function goNext() {
    setFormError(null);
    if (!canAdvanceFromStep(step, form)) {
      if (step === "identity" || step === "supply") {
        const v = validateTokenLaunchForm(form);
        setFormError(v.ok ? null : v.error);
      }
      return;
    }
    const next = nextLaunchStep(step);
    if (next) setStep(next);
  }

  function goBack() {
    setFormError(null);
    const prev = prevLaunchStep(step);
    if (prev) setStep(prev);
  }

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
        <h2 className="text-xl font-black text-white">Launch Kit</h2>
        <p className="mt-3 text-sm text-amber-100/90">
          Deploy <span className="font-mono">TokenFactory</span> on Base, then set{" "}
          <span className="font-mono">NEXT_PUBLIC_TOKEN_FACTORY_ADDRESS</span> in env.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border border-cyan-300/25 bg-gradient-to-br from-cyan-500/10 via-slate-950/60 to-emerald-500/10 p-6 md:p-8">
        <p className="text-[11px] font-black uppercase tracking-[0.35em] text-cyan-200/90">Launch Kit</p>
        <h2 className="mt-2 text-3xl font-black text-white">Create your token on Base</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          Step-by-step ERC-20 deploy. Full supply mints to your wallet — you pay gas only.
        </p>
        <div className="mt-5">
          <StepIndicator step={step} />
        </div>
      </section>

      {step === "intro" ? (
        <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
          <h3 className="text-xl font-black text-white">What you get</h3>
          <ul className="mt-4 grid gap-3 text-sm text-slate-300">
            <li className="rounded-xl border border-white/8 bg-black/30 px-4 py-3">
              <span className="font-bold text-cyan-200">Standard ERC-20</span> — 18 decimals, verified bytecode via
              factory
            </li>
            <li className="rounded-xl border border-white/8 bg-black/30 px-4 py-3">
              <span className="font-bold text-emerald-200">Full supply to you</span> — import in any wallet with
              contract address
            </li>
            <li className="rounded-xl border border-white/8 bg-black/30 px-4 py-3">
              <span className="font-bold text-violet-200">No pool auto-created</span> — add liquidity on Aerodrome /
              Uniswap when ready
            </li>
          </ul>
          <button
            type="button"
            onClick={goNext}
            className="mt-6 rounded-xl bg-gradient-to-r from-cyan-500/80 to-emerald-500/70 px-5 py-2.5 text-sm font-black text-white"
          >
            Start wizard
          </button>
        </section>
      ) : null}

      {step === "identity" ? (
        <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
          <h3 className="text-lg font-black text-white">Token identity</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Name</span>
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
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Symbol</span>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="MBT"
                maxLength={11}
                className="mt-2 w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 font-mono uppercase text-white outline-none focus:border-cyan-300/50"
              />
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={goBack} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-slate-300">
              Back
            </button>
            <button type="button" onClick={goNext} className="rounded-xl bg-cyan-500/80 px-4 py-2 text-sm font-black text-white">
              Continue
            </button>
          </div>
        </section>
      ) : null}

      {step === "supply" ? (
        <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
          <h3 className="text-lg font-black text-white">Initial supply</h3>
          <label className="mt-4 block">
            <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Whole tokens</span>
            <input
              type="text"
              inputMode="decimal"
              value={supplyWhole}
              onChange={(e) => setSupplyWhole(e.target.value)}
              placeholder="1000000"
              className="mt-2 w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 font-mono text-white outline-none focus:border-cyan-300/50"
            />
            <p className="mt-1 text-xs text-slate-500">18 decimals — e.g. 1,000,000 = 1M tokens minted to you.</p>
          </label>
          <div className="mt-5 flex gap-2">
            <button type="button" onClick={goBack} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-slate-300">
              Back
            </button>
            <button type="button" onClick={goNext} className="rounded-xl bg-cyan-500/80 px-4 py-2 text-sm font-black text-white">
              Review
            </button>
          </div>
        </section>
      ) : null}

      {step === "review" ? (
        <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
          <h3 className="text-lg font-black text-white">Review & launch</h3>
          {validation.ok ? (
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between rounded-xl bg-black/30 px-4 py-2">
                <dt className="text-slate-500">Name</dt>
                <dd className="font-bold text-white">{validation.name}</dd>
              </div>
              <div className="flex justify-between rounded-xl bg-black/30 px-4 py-2">
                <dt className="text-slate-500">Symbol</dt>
                <dd className="font-mono font-bold text-cyan-200">{validation.symbol}</dd>
              </div>
              <div className="flex justify-between rounded-xl bg-black/30 px-4 py-2">
                <dt className="text-slate-500">Supply</dt>
                <dd className="font-mono text-white">{validation.supplyWhole}</dd>
              </div>
              {address ? (
                <div className="flex justify-between rounded-xl bg-black/30 px-4 py-2">
                  <dt className="text-slate-500">Recipient</dt>
                  <dd className="font-mono text-cyan-200">{shortenAddressDisplay(address)}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {!isConnected ? (
            <p className="mt-4 text-sm text-amber-200">Connect a wallet to launch.</p>
          ) : !isOnBase ? (
            <button
              type="button"
              disabled={isSwitchingChain}
              onClick={() => switchChainAsync({ chainId: base.id })}
              className="mt-4 rounded-xl border border-amber-300/40 bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-100"
            >
              {isSwitchingChain ? "Switching…" : "Switch to Base"}
            </button>
          ) : (
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={goBack} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-slate-300">
                Back
              </button>
              <button
                type="button"
                disabled={!validation.ok || isLaunching || isConfirming}
                onClick={handleLaunch}
                className="rounded-xl bg-gradient-to-r from-cyan-500/80 to-emerald-500/70 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
              >
                {isLaunching || isConfirming ? "Confirm in wallet…" : "Launch on Base"}
              </button>
            </div>
          )}

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
              <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="font-mono text-cyan-300 hover:underline">
                {txHash.slice(0, 12)}…
              </a>
              {txConfirmed ? " · confirmed" : " · confirming"}
            </p>
          ) : null}
        </section>
      ) : null}

      {step === "success" && launchedToken && launchedMeta ? (
        <section className="rounded-3xl border border-emerald-300/35 bg-emerald-500/10 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200/90">Token live</p>
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
              BaseScan ↗
            </a>
            <Link href={`/?tab=swap`} className="rounded-xl border border-violet-300/35 px-4 py-2 text-sm font-bold text-violet-100">
              Open swap
            </Link>
            {address ? (
              <Link href={`/card/${address}`} className="rounded-xl border border-cyan-300/35 px-4 py-2 text-sm font-bold text-cyan-100">
                Identity card ↗
              </Link>
            ) : null}
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Import: contract above · decimals 18 · {launchedMeta.supplyFormatted} tokens in your wallet.
          </p>
          <button
            type="button"
            onClick={() => {
              setName("");
              setSymbol("");
              setSupplyWhole("1000000");
              setLaunchedToken(null);
              setLaunchedMeta(null);
              setStep("intro");
            }}
            className="mt-4 text-sm font-bold text-slate-400 underline"
          >
            Launch another token
          </button>
        </section>
      ) : null}

      <p className="text-xs text-slate-600">
        Not financial advice. Anyone can deploy tokens with any name — verify contract address before trading.
      </p>
    </div>
  );
}
