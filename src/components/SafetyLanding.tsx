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
      setError("That’s not a valid address.");
      return;
    }
    setError(null);
    router.push(`/safety/${getAddress(trimmed as `0x${string}`)}`);
  }

  const okShape = /^0x[a-fA-F0-9]{40}$/.test(raw.trim());

  return (
    <form onSubmit={onSubmit} className="relative rounded-[2rem] border border-white/14 bg-black/55 p-[1px] shadow-[0_0_120px_rgba(168,85,247,0.12)]">
      <div className="rounded-[1.945rem] border border-white/8 bg-black/65 p-5 md:p-8">
        <label className="block text-[11px] font-bold uppercase tracking-[0.3em] text-slate-500">
          Base address
        </label>
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
            className={`min-h-[52px] flex-1 rounded-2xl border bg-black/50 px-4 py-3 font-mono text-sm text-white outline-none ring-4 ring-transparent transition placeholder:text-slate-600 md:text-base ${okShape ? "border-cyan-400/65 ring-cyan-400/25" : "border-white/12 focus:border-cyan-300/65 focus:ring-cyan-500/15"}`}
          />
          <button
            type="submit"
            className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-400 px-8 py-3 text-[15px] font-black uppercase tracking-[0.12em] text-white shadow-[0_12px_40px_rgba(168,85,247,0.35)] hover:brightness-110 active:translate-y-[1px]"
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
            Data comes from public Base nodes. We don’t store what you paste. Share the result link if you want.
          </p>
        )}
      </div>
    </form>
  );
}
