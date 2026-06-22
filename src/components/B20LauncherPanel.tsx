"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { decodeEventLog, parseUnits } from "viem";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { useFlashblocksReceipt } from "@/hooks/useFlashblocksReceipt";
import { B20_FACTORY_ABI, B20_TOKEN_ABI } from "@/lib/b20/abi";
import { B20_FACTORY_ADDRESS, B20_VARIANT_ASSET } from "@/lib/b20/constants";
import {
  buildCreateInitCalls,
  encodeAssetCreateParams,
  randomB20Salt,
} from "@/lib/b20/encode";
import { capToWei, validateB20LaunchForm, type B20LaunchForm } from "@/lib/b20/validate";
import {
  BASE_SEPOLIA_CHAIN_ID,
  sepoliaExplorerToken,
  sepoliaExplorerTx,
} from "@/lib/baseSepolia";
import { shortenAddressDisplay } from "@/lib/knownBaseProtocols";
import {
  LAUNCH_KIT_STEPS,
  launchStepIndex,
  nextLaunchStep,
  prevLaunchStep,
  type LaunchKitStepId,
} from "@/lib/launchKitSteps";
import { validateTokenLaunchForm } from "@/lib/tokenLaunchValidate";

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
                ? "bg-violet-500/30 text-violet-100 ring-1 ring-violet-300/40"
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

function canAdvanceB20Step(step: LaunchKitStepId, form: B20LaunchForm): boolean {
  if (step === "intro") return true;
  if (step === "identity") {
    const v = validateTokenLaunchForm({ ...form, supplyWhole: "1" });
    return v.ok;
  }
  if (step === "supply") return validateB20LaunchForm(form).ok;
  if (step === "review") return validateB20LaunchForm(form).ok;
  return false;
}

export function B20LauncherPanel() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: BASE_SEPOLIA_CHAIN_ID });
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

  const [step, setStep] = useState<LaunchKitStepId>("intro");
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [supplyWhole, setSupplyWhole] = useState("1000");
  const [capWhole, setCapWhole] = useState("1000000");
  const [formError, setFormError] = useState<string | null>(null);
  const [launchedToken, setLaunchedToken] = useState<`0x${string}` | null>(null);
  const [launchedMeta, setLaunchedMeta] = useState<{
    name: string;
    symbol: string;
    supplyFormatted: string;
    decimals: number;
  } | null>(null);
  const [phase, setPhase] = useState<"idle" | "creating" | "minting" | "done">("idle");
  const pendingMintRef = useRef<{ token: `0x${string}`; amount: bigint; recipient: `0x${string}` } | null>(
    null
  );

  const form = useMemo<B20LaunchForm>(
    () => ({ name, symbol, supplyWhole, decimals, capWhole }),
    [name, symbol, supplyWhole, decimals, capWhole]
  );
  const validation = useMemo(() => validateB20LaunchForm(form), [form]);
  const isOnSepolia = chainId === BASE_SEPOLIA_CHAIN_ID;

  const {
    data: createTxHash,
    isPending: isLaunching,
    error: launchError,
    writeContract: writeCreate,
    reset: resetLaunch,
  } = useWriteContract();

  const {
    data: mintTxHash,
    isPending: isMinting,
    error: mintError,
    writeContract: writeMint,
    reset: resetMint,
  } = useWriteContract();

  const { isLoading: isConfirmingCreate, isSuccess: createConfirmed } = useFlashblocksReceipt(
    createTxHash,
    true,
    BASE_SEPOLIA_CHAIN_ID
  );
  const { isLoading: isConfirmingMint, isSuccess: mintConfirmed } = useFlashblocksReceipt(
    mintTxHash,
    true,
    BASE_SEPOLIA_CHAIN_ID
  );

  const isBusy =
    isLaunching || isConfirmingCreate || isMinting || isConfirmingMint || phase === "creating" || phase === "minting";

  useEffect(() => {
    if (!createConfirmed || !createTxHash || !publicClient) return;

    let cancelled = false;

    (async () => {
      const receipt = await publicClient.getTransactionReceipt({ hash: createTxHash });
      if (cancelled) return;
      if (receipt.status !== "success") {
        setPhase("idle");
        setFormError("Create transaction reverted. Try again with a new token name or symbol.");
        return;
      }

      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== B20_FACTORY_ADDRESS.toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({
            abi: B20_FACTORY_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName !== "B20Created") continue;

          const token = decoded.args.token as `0x${string}`;
          const tokenName = decoded.args.name as string;
          const tokenSymbol = decoded.args.symbol as string;
          const tokenDecimals = Number(decoded.args.decimals);
          setLaunchedToken(token);
          if (validation.ok) {
            setLaunchedMeta({
              name: tokenName,
              symbol: tokenSymbol,
              supplyFormatted: validation.supplyWhole,
              decimals: tokenDecimals,
            });
          }

          const pending = pendingMintRef.current;
          if (pending && pending.amount > BigInt(0)) {
            setPhase("minting");
            writeMint({
              chainId: BASE_SEPOLIA_CHAIN_ID,
              address: token,
              abi: B20_TOKEN_ABI,
              functionName: "mint",
              args: [pending.recipient, pending.amount],
            });
          } else {
            setPhase("done");
            setStep("success");
          }
          return;
        } catch {
          /* not B20Created */
        }
      }

      setPhase("idle");
      setFormError("Token was created but B20Created event was not found in the receipt.");
    })().catch(() => {
      if (!cancelled) setPhase("idle");
    });

    return () => {
      cancelled = true;
    };
  }, [createConfirmed, createTxHash, publicClient, validation, writeMint]);

  useEffect(() => {
    if (!mintConfirmed || !mintTxHash || !publicClient) return;

    let cancelled = false;
    (async () => {
      const receipt = await publicClient.getTransactionReceipt({ hash: mintTxHash });
      if (cancelled) return;
      if (receipt.status !== "success") {
        setPhase("idle");
        setFormError("Token was created, but mint reverted. Mint manually with MINT_ROLE.");
        setStep("success");
        return;
      }
      pendingMintRef.current = null;
      setPhase("done");
      setStep("success");
    })().catch(() => {
      if (!cancelled) setPhase("idle");
    });

    return () => {
      cancelled = true;
    };
  }, [mintConfirmed, mintTxHash, publicClient]);

  function goNext() {
    setFormError(null);
    if (!canAdvanceB20Step(step, form)) {
      if (step === "identity" || step === "supply") {
        const v = validateB20LaunchForm(form);
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
    pendingMintRef.current = null;
    setPhase("creating");
    resetLaunch();
    resetMint();

    if (!isConnected || !address) {
      setPhase("idle");
      setFormError("Connect a wallet first.");
      return;
    }
    if (!isOnSepolia) {
      setFormError("Switch to Base Sepolia.");
      setPhase("idle");
      return;
    }
    if (!validation.ok) {
      setFormError(validation.error);
      setPhase("idle");
      return;
    }

    let mintAmount: bigint;
    try {
      mintAmount = parseUnits(validation.supplyWhole, validation.decimals);
    } catch {
      setFormError("Could not parse initial supply.");
      setPhase("idle");
      return;
    }

    let supplyCap: bigint;
    try {
      supplyCap = capToWei(validation.capWhole, validation.decimals);
    } catch {
      setFormError("Supply cap is too large.");
      setPhase("idle");
      return;
    }

    pendingMintRef.current =
      mintAmount > BigInt(0) ? { token: "0x0", amount: mintAmount, recipient: address } : null;

    const params = encodeAssetCreateParams(
      validation.name,
      validation.symbol,
      address,
      validation.decimals
    );
    const initCalls = buildCreateInitCalls({
      admin: address,
      supplyCap,
    });
    const salt = randomB20Salt();

    writeCreate({
      chainId: BASE_SEPOLIA_CHAIN_ID,
      address: B20_FACTORY_ADDRESS,
      abi: B20_FACTORY_ABI,
      functionName: "createB20",
      args: [B20_VARIANT_ASSET, salt, params, initCalls],
    });
  }

  return (
    <div className="grid gap-5">
      <section className="os-panel p-6 md:p-8">
        <p className="os-eyebrow">B20 Launch</p>
        <h2 className="os-display mt-2 text-3xl font-semibold text-white">Create a native B20 token</h2>
        <p className="mt-3 max-w-2xl text-sm text-slate-300">
          Official Base B20 standard — cheaper transfers, built-in roles and supply cap. Deploy on{" "}
          <span className="font-mono text-violet-200">Base Sepolia</span> in two wallet confirmations
          (create, then mint).
        </p>
        <div className="mt-5">
          <StepIndicator step={step} />
        </div>
      </section>

      {step === "intro" ? (
        <section className="os-panel p-6">
          <h3 className="text-xl font-black text-white">What is B20?</h3>
          <ul className="mt-4 grid gap-3 text-sm text-slate-300">
            <li className="rounded-xl border border-white/8 bg-black/30 px-4 py-3">
              <span className="font-bold text-violet-200">Native on Base</span> — ERC-20 compatible precompile,
              no custom contract to audit
            </li>
            <li className="rounded-xl border border-white/8 bg-black/30 px-4 py-3">
              <span className="font-bold text-emerald-200">Two-step deploy</span> — create token, then mint
              initial supply (matches Base CLI flow)
            </li>
            <li className="rounded-xl border border-white/8 bg-black/30 px-4 py-3">
              <span className="font-bold text-cyan-200">Testnet first</span> — deploy on Sepolia today; mainnet
              when B20 activates there
            </li>
          </ul>
          <p className="mt-4 text-xs text-slate-500">
            Need test ETH?{" "}
            <a
              href="https://portal.cdp.coinbase.com/products/faucet"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-300 underline"
            >
              Coinbase faucet ↗
            </a>
          </p>
          <button type="button" onClick={goNext} className="mt-6 os-cta os-display px-5 py-2.5 text-sm">
            Start wizard
          </button>
        </section>
      ) : null}

      {step === "identity" ? (
        <section className="os-panel p-6">
          <h3 className="text-lg font-black text-white">Token identity</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My B20 Token"
                maxLength={32}
                className="mt-2 w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 text-white outline-none focus:border-violet-300/50"
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
                className="mt-2 w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 font-mono uppercase text-white outline-none focus:border-violet-300/50"
              />
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={goBack}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-slate-300"
            >
              Back
            </button>
            <button type="button" onClick={goNext} className="os-cta os-display px-4 py-2 text-sm">
              Continue
            </button>
          </div>
        </section>
      ) : null}

      {step === "supply" ? (
        <section className="os-panel p-6">
          <h3 className="text-lg font-black text-white">Supply & decimals</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="block md:col-span-1">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Decimals</span>
              <input
                type="text"
                inputMode="numeric"
                value={decimals}
                onChange={(e) => setDecimals(e.target.value)}
                placeholder="18"
                className="mt-2 w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 font-mono text-white outline-none focus:border-violet-300/50"
              />
              <p className="mt-1 text-xs text-slate-500">6–18, fixed at creation.</p>
            </label>
            <label className="block md:col-span-1">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Initial mint</span>
              <input
                type="text"
                inputMode="decimal"
                value={supplyWhole}
                onChange={(e) => setSupplyWhole(e.target.value)}
                placeholder="1000"
                className="mt-2 w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 font-mono text-white outline-none focus:border-violet-300/50"
              />
            </label>
            <label className="block md:col-span-1">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">Supply cap</span>
              <input
                type="text"
                inputMode="decimal"
                value={capWhole}
                onChange={(e) => setCapWhole(e.target.value)}
                placeholder="1000000"
                className="mt-2 w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 font-mono text-white outline-none focus:border-violet-300/50"
              />
            </label>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={goBack}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-slate-300"
            >
              Back
            </button>
            <button type="button" onClick={goNext} className="os-cta os-display px-4 py-2 text-sm">
              Review
            </button>
          </div>
        </section>
      ) : null}

      {step === "review" ? (
        <section className="os-panel p-6">
          <h3 className="text-lg font-black text-white">Review & deploy</h3>
          {validation.ok ? (
            <dl className="mt-4 grid gap-2 text-sm">
              <div className="flex justify-between rounded-xl bg-black/30 px-4 py-2">
                <dt className="text-slate-500">Network</dt>
                <dd className="font-bold text-violet-200">Base Sepolia</dd>
              </div>
              <div className="flex justify-between rounded-xl bg-black/30 px-4 py-2">
                <dt className="text-slate-500">Name</dt>
                <dd className="font-bold text-white">{validation.name}</dd>
              </div>
              <div className="flex justify-between rounded-xl bg-black/30 px-4 py-2">
                <dt className="text-slate-500">Symbol</dt>
                <dd className="font-mono font-bold text-violet-200">{validation.symbol}</dd>
              </div>
              <div className="flex justify-between rounded-xl bg-black/30 px-4 py-2">
                <dt className="text-slate-500">Decimals</dt>
                <dd className="font-mono text-white">{validation.decimals}</dd>
              </div>
              <div className="flex justify-between rounded-xl bg-black/30 px-4 py-2">
                <dt className="text-slate-500">Initial mint</dt>
                <dd className="font-mono text-white">{validation.supplyWhole}</dd>
              </div>
              <div className="flex justify-between rounded-xl bg-black/30 px-4 py-2">
                <dt className="text-slate-500">Supply cap</dt>
                <dd className="font-mono text-white">{validation.capWhole}</dd>
              </div>
              {address ? (
                <div className="flex justify-between rounded-xl bg-black/30 px-4 py-2">
                  <dt className="text-slate-500">Admin & minter</dt>
                  <dd className="font-mono text-cyan-200">{shortenAddressDisplay(address)}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {!isConnected ? (
            <p className="mt-4 text-sm text-amber-200">Connect a wallet to deploy.</p>
          ) : !isOnSepolia ? (
            <button
              type="button"
              disabled={isSwitchingChain}
              onClick={() => switchChainAsync({ chainId: BASE_SEPOLIA_CHAIN_ID })}
              className="mt-4 rounded-xl border border-violet-300/40 bg-violet-500/15 px-4 py-2 text-sm font-bold text-violet-100"
            >
              {isSwitchingChain ? "Switching…" : "Switch to Base Sepolia"}
            </button>
          ) : (
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={goBack}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-slate-300"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!validation.ok || isBusy}
                onClick={handleLaunch}
                className="os-cta os-display px-5 py-2.5 text-sm disabled:opacity-50"
              >
                {isLaunching || (phase === "creating" && isConfirmingCreate)
                  ? "Creating token…"
                  : isMinting || phase === "minting"
                    ? "Minting supply…"
                    : "Deploy B20 on Sepolia"}
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
          {mintError ? (
            <p className="mt-3 text-sm text-rose-300">
              {"shortMessage" in mintError && typeof mintError.shortMessage === "string"
                ? mintError.shortMessage
                : mintError.message}
            </p>
          ) : null}
          {createTxHash ? (
            <p className="mt-3 text-sm text-slate-400">
              Create tx:{" "}
              <a
                href={sepoliaExplorerTx(createTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-violet-300 hover:underline"
              >
                {createTxHash.slice(0, 12)}…
              </a>
              {createConfirmed ? " · confirmed" : " · confirming"}
            </p>
          ) : null}
          {mintTxHash ? (
            <p className="mt-1 text-sm text-slate-400">
              Mint tx:{" "}
              <a
                href={sepoliaExplorerTx(mintTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-violet-300 hover:underline"
              >
                {mintTxHash.slice(0, 12)}…
              </a>
              {mintConfirmed ? " · confirmed" : " · confirming"}
            </p>
          ) : null}
        </section>
      ) : null}

      {step === "success" && launchedToken && launchedMeta ? (
        <section className="rounded-3xl border border-emerald-300/35 bg-emerald-500/10 p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200/90">B20 live</p>
          <h3 className="mt-1 text-2xl font-black text-white">
            {launchedMeta.name}{" "}
            <span className="font-mono text-emerald-200">({launchedMeta.symbol})</span>
          </h3>
          <p className="mt-2 break-all font-mono text-sm text-emerald-100">{launchedToken}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={sepoliaExplorerToken(launchedToken)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-emerald-300/40 px-4 py-2 text-sm font-bold text-emerald-100"
            >
              Sepolia BaseScan ↗
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            {launchedMeta.supplyFormatted} {launchedMeta.symbol} minted · {launchedMeta.decimals} decimals ·
            address starts with <span className="font-mono">0xB200…</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setName("");
              setSymbol("");
              setDecimals("18");
              setSupplyWhole("1000");
              setCapWhole("1000000");
              setLaunchedToken(null);
              setLaunchedMeta(null);
              pendingMintRef.current = null;
              setPhase("idle");
              setStep("intro");
            }}
            className="mt-4 text-sm font-bold text-slate-400 underline"
          >
            Deploy another B20
          </button>
        </section>
      ) : null}

      <p className="text-xs text-slate-600">
        B20 is an experimental Base standard. Verify token addresses before trading. Not financial advice.
      </p>
    </div>
  );
}
