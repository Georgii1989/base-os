"use client";

const GRID_LETTERS = "GRID".split("");
const GRID_COLORS = ["#ff4d8d", "#ff9f43", "#ffe14d", "#6ee7a8", "#4dabff", "#b57bff"];

export function Grid646GameBanner() {
  return (
    <section className="grid646-hero relative overflow-hidden rounded-3xl p-6 sm:p-8">
      <div className="grid646-pixels pointer-events-none absolute inset-0" aria-hidden />

      {/* Floating mascots */}
      <div className="grid646-mascot-o pointer-events-none absolute -left-2 bottom-4 hidden sm:block" aria-hidden>
        <div className="grid646-mascot-float grid646-mascot-float-delay relative h-16 w-16 rounded-full border-[5px] border-cyan-400 bg-cyan-500/30 shadow-[0_0_30px_rgba(34,211,238,0.5),inset_0_0_20px_rgba(34,211,238,0.2)]">
          <span className="absolute left-1/2 top-[38%] h-2 w-2 -translate-x-[130%] rounded-full bg-slate-900" />
          <span className="absolute left-1/2 top-[38%] h-2 w-2 translate-x-[30%] rounded-full bg-slate-900" />
          <span className="absolute bottom-[28%] left-1/2 h-1.5 w-4 -translate-x-1/2 rounded-full bg-slate-900/80" />
        </div>
      </div>
      <div className="grid646-mascot-x pointer-events-none absolute -right-1 bottom-6 hidden sm:block" aria-hidden>
        <div className="grid646-mascot-float relative flex h-14 w-14 items-center justify-center text-4xl font-black leading-none text-fuchsia-400 drop-shadow-[0_0_24px_rgba(244,114,182,0.8)]">
          ✕
        </div>
      </div>

      <div className="grid646-float-sign relative z-10 mx-auto max-w-md text-center">
        <p className="grid646-badge mb-3 inline-block rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-200/90">
          Base OS · Game
        </p>

        <h2 className="grid646-title-main leading-none">
          <span className="block text-[2.4rem] font-black tracking-tight sm:text-[2.85rem]">
            {GRID_LETTERS.map((ch, i) => (
              <span
                key={ch + i}
                className="grid646-rainbow-char inline-block"
                style={{
                  color: GRID_COLORS[i % GRID_COLORS.length],
                  animationDelay: `${i * 0.1}s`,
                }}
              >
                {ch}
              </span>
            ))}{" "}
            <span className="grid646-title-six inline-block text-[#5b7cff]">6×6</span>
          </span>
        </h2>

        <p className="mt-3 text-sm font-semibold tracking-wide text-cyan-100/95 sm:text-base">
          Four in a row <span className="text-white/40">·</span> on Base
        </p>

        <p className="mt-4 text-xs leading-relaxed text-white/70 sm:text-sm">
          Create a <strong className="text-amber-200">room</strong> or pick from the lobby.{" "}
          <span className="font-mono text-amber-300/90">1/0</span> waiting ·{" "}
          <span className="font-mono text-emerald-300/90">1/1</span> in play
        </p>
      </div>
    </section>
  );
}
