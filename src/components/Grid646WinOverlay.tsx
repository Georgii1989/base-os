"use client";

export function Grid646WinOverlay({
  label,
  sublabel,
}: {
  label: "WIN" | "DRAW";
  sublabel: string;
}) {
  const isWin = label === "WIN";
  return (
    <div
      className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center rounded-3xl bg-[#0a0618]/75 backdrop-blur-[3px]"
      aria-live="polite"
    >
      <p
        className={`grid646-win-label animate-grid646-win font-black tracking-[0.15em] ${
          isWin
            ? "text-5xl text-yellow-300 sm:text-6xl"
            : "font-mono text-4xl text-slate-200 sm:text-5xl"
        }`}
      >
        {label}
      </p>
      <p className="mt-3 max-w-[16rem] text-center text-xs font-bold text-white/90 sm:text-sm">
        {sublabel}
      </p>
      {isWin ? (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.35em] text-fuchsia-300/80">
          ★ onchain ★
        </p>
      ) : null}
    </div>
  );
}
