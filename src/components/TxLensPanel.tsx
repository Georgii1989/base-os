"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { formatEther, getAddress, isAddress, parseEther } from "viem";
import { base } from "wagmi/chains";
import { useAccount, usePublicClient } from "wagmi";
import { decodeSelectorHex } from "@/lib/txLensHints";

type SimOutcome =
  | { kind: "idle" }
  | { kind: "running" }
  | {
      kind: "ok";
      gas: bigint | null;
      returnDataHex: string;
      returnDataTruncated: string;
      hint: string | null;
      valueWei: bigint;
      to: `0x${string}`;
      from: `0x${string}`;
    }
  | { kind: "error"; headline: string; detail: string; hint: string | null };

function normalizeDataHex(raw: string): `0x${string}` | null {
  const t = raw.trim();
  if (!t || t === "0x") return "0x";
  const h = t.startsWith("0x") ? t : `0x${t}`;
  if (!/^0x(?:[a-fA-F0-9]{2})*$/.test(h)) return null;
  return h as `0x${string}`;
}

function extractErrorTexts(err: unknown): { headline: string; detail: string } {
  if (typeof err !== "object" || err === null) {
    return { headline: "Preview failed", detail: String(err) };
  }

  type MaybeMsg = {
    shortMessage?: string;
    message?: string;
    details?: string;
    cause?: unknown;
  };
  const obj = err as MaybeMsg;
  const headline =
    typeof obj.shortMessage === "string" && obj.shortMessage.length > 0
      ? obj.shortMessage
      : typeof obj.message === "string" && obj.message.length > 0
        ? obj.message
        : "Preview failed";
  const detail =
    typeof obj.details === "string"
      ? obj.details
      : obj.cause
        ? String(obj.cause)
        : headline;

  return { headline, detail };
}

export function TxLensPanel() {
  const publicClient = usePublicClient({ chainId: base.id });
  const { address } = useAccount();

  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [valueEth, setValueEth] = useState("0");
  const [dataInput, setDataInput] = useState("");
  const [outcome, setOutcome] = useState<SimOutcome>({ kind: "idle" });
  const [copyReturnOk, setCopyReturnOk] = useState(false);

  const resolvedFrom = useMemo(() => {
    const trimmed = fromInput.trim();
    if (trimmed && isAddress(trimmed)) return getAddress(trimmed as `0x${string}`);
    return address ?? null;
  }, [fromInput, address]);

  const dataNormalized = normalizeDataHex(dataInput);
  const typingHint =
    dataNormalized && dataNormalized !== "0x" ? decodeSelectorHex(dataNormalized) : null;

  const applyConnectedAsFrom = useCallback(() => {
    if (address) setFromInput(address);
  }, [address]);

  async function simulate() {
    if (!publicClient || !resolvedFrom) {
      setOutcome({
        kind: "error",
        headline: resolvedFrom ? "Connection issue" : "Who sends this?",
        detail: resolvedFrom ? "Try again — the network may be busy." : "Connect your wallet or paste the sender address.",
        hint: typingHint,
      });
      return;
    }

    const toTrimmed = toInput.trim();
    if (!isAddress(toTrimmed)) {
      setOutcome({
        kind: "error",
        headline: "Recipient address",
        detail: "Enter a valid Base address you’re sending to.",
        hint: typingHint,
      });
      return;
    }

    const dataHex = normalizeDataHex(dataInput);
    if (dataHex === null) {
      setOutcome({
        kind: "error",
        headline: "Hex data",
        detail: "Use hex only (pairs of 0–9, a–f). Leave empty to send ETH only.",
        hint: null,
      });
      return;
    }

    let valueWei = BigInt(0);
    try {
      valueWei = parseEther(valueEth.trim() === "" ? "0" : valueEth.trim());
    } catch {
      setOutcome({
        kind: "error",
        headline: "Invalid ETH amount",
        detail: `Could not parse «${valueEth}» — decimals like 0.05.`,
        hint: typingHint,
      });
      return;
    }

    const toChecksum = getAddress(toTrimmed as `0x${string}`);
    const hint = decodeSelectorHex(dataHex);

    setOutcome({ kind: "running" });
    try {
      let gas: bigint | null = null;
      try {
        gas = await publicClient.estimateGas({
          account: resolvedFrom,
          to: toChecksum,
          value: valueWei,
          data: dataHex,
        });
      } catch {
        gas = null;
      }

      const callResult = await publicClient.call({
        account: resolvedFrom,
        to: toChecksum,
        value: valueWei,
        data: dataHex,
      });
      const returnDataHex = typeof callResult.data === "string" ? callResult.data : "0x";
      const returnDataTruncated =
        returnDataHex.length <= 280 ? returnDataHex : `${returnDataHex.slice(0, 280)}…`;

      setOutcome({
        kind: "ok",
        gas,
        returnDataHex,
        returnDataTruncated,
        hint,
        valueWei,
        to: toChecksum,
        from: resolvedFrom,
      });
    } catch (err: unknown) {
      const text = extractErrorTexts(err);
      setOutcome({
        kind: "error",
        headline: text.headline,
        detail: text.detail,
        hint,
      });
    }
  }

  const valueSummaryOk =
    outcome.kind === "ok" ? `${formatEther(outcome.valueWei)} ETH` : null;

  const copyReturnData = useCallback(async () => {
    if (outcome.kind !== "ok") return;
    try {
      await navigator.clipboard.writeText(outcome.returnDataHex);
      setCopyReturnOk(true);
      window.setTimeout(() => setCopyReturnOk(false), 2000);
    } catch {
      /* ignore */
    }
  }, [outcome]);

  return (
    <div className="grid gap-6">
      <div className="relative overflow-hidden rounded-[1.85rem] border border-indigo-300/35 bg-gradient-to-br from-indigo-500/18 via-purple-950/40 to-black/90 p-6 md:p-8">
        <div className="pointer-events-none absolute left-[-20%] top-[-30%] h-60 w-60 rounded-full bg-fuchsia-500/12 blur-[90px]" />
        <header className="relative max-w-4xl space-y-3">
          <p className="text-[11px] font-black uppercase tracking-[0.38em] text-indigo-200/90">
            Test · nothing is sent from your wallet
          </p>
          <h2 className="text-4xl font-black tracking-tight text-white md:text-[2.85rem]">Transaction preview</h2>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-300 md:text-[15px]">
            Paste data from BaseScan or your wallet preview. You’ll see if the call likely works — without signing or
            spending gas here.
          </p>
          <Link
            href="/safety"
            className="inline-flex rounded-2xl border border-teal-300/55 bg-teal-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.15em] text-teal-100 hover:bg-teal-500/25"
          >
            Lookup an unknown address →
          </Link>
        </header>
      </div>

      <div className="grid gap-4 rounded-3xl border border-white/12 bg-black/45 p-5 md:p-7">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1.5 text-sm md:col-span-2 lg:col-span-1">
            <span className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-500">Sender</span>
            <input
              value={fromInput}
              onChange={(e) => setFromInput(e.target.value)}
              placeholder={address ?? "Paste or connect"}
              className="rounded-2xl border border-white/12 bg-black/55 px-3 py-3 font-mono text-xs text-white outline-none placeholder:text-slate-600 focus:border-indigo-400/55 md:text-[13px]"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => applyConnectedAsFrom()}
              disabled={!address}
              className="h-[50px] w-full rounded-2xl border border-white/14 bg-white/5 px-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-200 hover:border-emerald-300/65 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-45 lg:max-w-[220px]"
            >
              Connected wallet fills this
            </button>
          </div>
          <label className="grid gap-1.5 text-sm md:col-span-2">
            <span className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-500">Recipient</span>
            <input
              value={toInput}
              onChange={(e) => setToInput(e.target.value)}
              placeholder="Contract or wallet receiving ETH"
              className="rounded-2xl border border-white/12 bg-black/55 px-3 py-3 font-mono text-xs text-white outline-none focus:border-indigo-400/55 md:text-[13px]"
            />
          </label>
          <label className="grid gap-1.5 text-sm md:col-span-2 lg:col-span-1">
            <span className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-500">ETH to send</span>
            <input
              value={valueEth}
              onChange={(e) => setValueEth(e.target.value)}
              placeholder="0"
              className="rounded-2xl border border-white/12 bg-black/55 px-3 py-3 font-mono text-sm text-white outline-none focus:border-indigo-400/55"
            />
          </label>
          <label className="grid gap-1.5 text-sm md:col-span-2">
            <span className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-500">Hex data (optional)</span>
            <textarea
              value={dataInput}
              spellCheck={false}
              placeholder="From BaseScan, or empty if you only send ETH"
              rows={4}
              onChange={(e) => setDataInput(e.target.value)}
              className="resize-y rounded-2xl border border-white/12 bg-black/55 px-3 py-3 font-mono text-[11px] text-emerald-100/95 outline-none focus:border-emerald-300/65 md:text-xs"
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={outcome.kind === "running"}
            onClick={() => void simulate()}
            className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 px-10 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_16px_48px_rgba(99,102,241,0.35)] transition hover:brightness-110 disabled:opacity-45"
          >
            {outcome.kind === "running" ? "Checking…" : "Run preview"}
          </button>
          <button
            type="button"
            onClick={() => {
              setToInput("");
              setValueEth("0");
              setDataInput("");
              setOutcome({ kind: "idle" });
            }}
            className="rounded-2xl border border-white/15 px-6 py-3 text-xs font-bold text-slate-300 hover:bg-white/5"
          >
            Reset
          </button>
        </div>
      </div>

      {typingHint ? (
        <p className="rounded-3xl border border-emerald-300/35 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-100 md:px-6">
          <span className="font-black uppercase tracking-[0.16em] text-emerald-200/90">Likely action:</span> {typingHint}
        </p>
      ) : null}

      {outcome.kind === "ok" ? (
        <div className="grid gap-4 rounded-3xl border border-emerald-400/45 bg-gradient-to-br from-emerald-500/12 via-black/60 to-black/70 p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.34em] text-emerald-200/90">Preview OK</p>
          <h3 className="text-2xl font-black text-white md:text-3xl">Not sent — test only.</h3>
          <ul className="grid gap-2 text-sm text-slate-200 md:grid-cols-2">
            <li>
              <span className="text-slate-500">From </span>
              <span className="font-mono text-[11px] text-white md:text-xs">{outcome.from}</span>
            </li>
            <li>
              <span className="text-slate-500">To </span>
              <span className="font-mono text-[11px] text-white md:text-xs">{outcome.to}</span>
            </li>
            <li>
              <span className="text-slate-500">Value </span>
              <span className="font-mono text-cyan-100">{valueSummaryOk}</span>
            </li>
            <li>
              <span className="text-slate-500">Gas (estimate) </span>
              <span className="font-mono text-fuchsia-100">
                {outcome.gas !== null && outcome.gas > BigInt(0)
                  ? outcome.gas.toLocaleString()
                  : "— (skip if preview worked)"}
              </span>
            </li>
          </ul>
          {outcome.hint ? (
            <p className="text-sm text-emerald-100/90">
              <span className="font-black text-emerald-200">Note:</span> {outcome.hint}
            </p>
          ) : null}
          <div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                Answer data
              </p>
              <button
                type="button"
                onClick={() => void copyReturnData()}
                className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100 hover:bg-emerald-500/30"
              >
                {copyReturnOk ? "Copied" : "Copy hex"}
              </button>
            </div>
            <pre className="mt-2 max-h-52 overflow-auto rounded-2xl border border-white/10 bg-black/70 p-4 font-mono text-[11px] leading-relaxed text-emerald-100/95">
              {outcome.returnDataTruncated}
            </pre>
          </div>
        </div>
      ) : null}

      {outcome.kind === "error" ? (
        <div className="grid gap-3 rounded-3xl border border-rose-400/45 bg-gradient-to-br from-rose-500/12 via-black/60 to-black/75 p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.34em] text-rose-200/95">Problem</p>
          <h3 className="text-2xl font-black text-rose-100">{outcome.headline}</h3>
          {outcome.hint ? (
            <p className="text-sm text-amber-200/90">
              <span className="font-black">Note:</span> {outcome.hint}
            </p>
          ) : null}
          <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/70 p-4 font-mono text-[11px] text-rose-100/95">
            {outcome.detail}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
