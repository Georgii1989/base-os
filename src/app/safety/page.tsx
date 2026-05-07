import Link from "next/link";
import { SafetyLanding } from "@/components/SafetyLanding";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Address lookup · Base OS",
  description: "Check any Base address without connecting a wallet.",
};

export default function SafetyPortalPage() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#070313] px-4 py-8 md:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(217,70,239,0.25),transparent_35%),radial-gradient(circle_at_75%_30%,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_55%_80%,rgba(236,72,153,0.20),transparent_40%)]" />

      <div className="relative z-[1] mx-auto w-full max-w-2xl">
        <nav className="flex flex-wrap items-center justify-between gap-3 pb-10">
          <Link
            href="/"
            className="rounded-2xl border border-white/12 bg-black/35 px-4 py-2 text-sm font-bold text-slate-200 backdrop-blur-sm transition hover:border-cyan-300/55 hover:text-cyan-100"
          >
            ← Base OS
          </Link>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-200/85">No wallet</p>
        </nav>

        <header className="text-center md:text-left">
          <div className="inline-flex rounded-full border border-fuchsia-300/35 bg-fuchsia-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.38em] text-fuchsia-100">
            Beta
          </div>
          <h1 className="mt-5 text-balance bg-gradient-to-r from-white via-cyan-100 to-fuchsia-200 bg-clip-text text-4xl font-black leading-tight tracking-tight text-transparent md:text-6xl md:leading-[1.05]">
            Look up a Base address
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-slate-300 md:mx-0 md:text-lg">
            Paste an address. We show wallet vs contract, balance, and links. Use ⌘K in Base OS for the same menu.
          </p>
        </header>

        <div className="mt-12">
          <SafetyLanding />
        </div>

        <p className="mt-14 text-center text-xs text-slate-500 md:text-left">
          Press <kbd className="rounded border border-white/12 bg-black/55 px-1.5 py-0.5 font-mono">⌘K</kbd> in Base OS for
          quick navigation.
        </p>
      </div>
    </main>
  );
}
