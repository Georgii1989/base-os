"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getAddress, isAddress } from "viem";

export function SafetyLanding() {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = raw.trim();
    if (!trimmed) {
      setError("Enter an address.");
      return;
    }
    if (!isAddress(trimmed)) {
      setError("That's not a valid address.");
      return;
    }
    setError(null);
    router.push(`/safety/${getAddress(trimmed as `0x${string}`)}`);
  }

  const okShape = /^0x[a-fA-F0-9]{40}$/.test(raw.trim());

  return (
    <form onSubmit={onSubmit} className="os-panel p-5 md:p-8">
      <label className="os-eyebrow block text-slate-500">Base address</label>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <input
          value={raw}
          onChange={(event) => {
            setRaw(event.target.value);
            setError(null);
          }}
          autoComplete="off"
          spellCheck={false}
          placeholder="0x…"
          className={`os-input min-h-[52px] flex-1 font-mono md:text-base ${okShape ? "border-amber-400/40 ring-2 ring-amber-400/20" : ""}`}
        />
        <button
          type="submit"
          className="os-cta os-display inline-flex shrink-0 items-center justify-center px-8 py-3 text-[15px] uppercase tracking-[0.12em]"
        >
          Look up →
        </button>
      </div>
      {error ? (
        <p className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-50">
          {error}
        </p>
      ) : (
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Data comes from public Base nodes. We don't store what you paste. Share the result link if you want.
        </p>
      )}
    </form>
  );
}
