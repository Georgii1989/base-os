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
      className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl bg-black/55 backdrop-blur-[2px]"
      aria-live="polite"
    >
      <p
        className={`animate-grid646-win font-black tracking-[0.2em] ${
          isWin ? "text-5xl text-yellow-300 drop-shadow-[0_0_28px_rgba(250,204,21,0.65)]" : "text-4xl text-slate-200"
        }`}
      >
        {label}
      </p>
      <p className="mt-2 max-w-[14rem] text-center text-xs font-bold text-white/90">{sublabel}</p>
    </div>
  );
}
