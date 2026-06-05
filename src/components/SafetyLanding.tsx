"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { isBasenameLike, resolveAddressInput } from "@/lib/baseBasenames";

export function SafetyLanding() {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = raw.trim();
    if (!trimmed) {
      setError("Enter an address or Base name.");
      return;
    }
    setIsResolving(true);
    setError(null);
    try {
      const resolved = await resolveAddressInput(trimmed);
      if (!resolved) {
        setError(
          isBasenameLike(trimmed)
            ? "Could not resolve that Base name."
            : "That's not a valid address or Base name."
        );
        return;
      }
      router.push(`/safety/${resolved}`);
    } finally {
      setIsResolving(false);
    }
  }

  const okShape =
    /^0x[a-fA-F0-9]{40}$/.test(raw.trim()) || isBasenameLike(raw.trim());

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="os-panel p-5 md:p-8">
      <label className="os-eyebrow block text-slate-500">Base address or name</label>
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <input
          value={raw}
          onChange={(event) => {
            setRaw(event.target.value);
            setError(null);
          }}
          autoComplete="off"
          spellCheck={false}
          placeholder="0x… or alice.base.eth"
          className={`os-input min-h-[52px] flex-1 font-mono md:text-base ${okShape ? "border-amber-400/40 ring-2 ring-amber-400/20" : ""}`}
        />
        <button
          type="submit"
          disabled={isResolving}
          className="os-cta os-display inline-flex shrink-0 items-center justify-center px-8 py-3 text-[15px] uppercase tracking-[0.12em] disabled:opacity-50"
        >
          {isResolving ? "Resolving…" : "Look up →"}
        </button>
      </div>
      {error ? (
        <p className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-50">
          {error}
        </p>
      ) : (
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Paste a checksum address or a <span className="text-slate-400">.base.eth</span> name. Data comes from
          public Base nodes — we don&apos;t store what you paste.
        </p>
      )}
    </form>
  );
}
