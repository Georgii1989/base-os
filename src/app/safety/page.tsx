import Link from "next/link";
import { SafetyLanding } from "@/components/SafetyLanding";
import { OsStandaloneBackdrop } from "@/components/os/OsChrome";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Address lookup · Base OS",
  description: "Check any Base address without connecting a wallet.",
};

export default function SafetyPortalPage() {
  return (
    <main className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[var(--os-void)] px-4 py-8 md:px-10">
      <OsStandaloneBackdrop />

      <div className="relative z-[1] mx-auto w-full max-w-2xl">
        <nav className="flex flex-wrap items-center justify-between gap-3 pb-10">
          <Link href="/" className="os-cta-ghost px-4 py-2 text-sm">
            ← Base OS
          </Link>
          <p className="os-eyebrow text-[11px]">No wallet</p>
        </nav>

        <header className="text-center md:text-left">
          <div className="inline-flex rounded-full border border-amber-400/35 bg-amber-500/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.38em] text-amber-100">
            Beta
          </div>
          <h1 className="os-display mt-5 text-balance text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl md:leading-[1.05]">
            Look up a Base address
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-slate-400 md:mx-0 md:text-lg">
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
