"use client";

import type { CellMark } from "@/lib/grid646";

export function Grid646Board({
  board,
  winningKeys,
  disabled,
  isBusy,
  onPlay,
  showLockedHint,
}: {
  board: CellMark[][];
  winningKeys: Set<string>;
  disabled: boolean;
  isBusy: boolean;
  onPlay: (row: number, col: number) => void;
  showLockedHint?: boolean;
}) {
  return (
    <section className="relative rounded-3xl border border-white/10 bg-black/40 p-4">
      {showLockedHint ? (
        <p className="mb-3 text-center text-xs text-slate-400">
          Board locked until opponent connects (1/1)
        </p>
      ) : null}
      <div
        className="relative mx-auto grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(6, minmax(0, 1fr))`, maxWidth: "22rem" }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => {
            const winKey = `${r},${c}`;
            const isWinCell = winningKeys.has(winKey);
            return (
              <button
                key={winKey}
                type="button"
                disabled={disabled || cell !== "empty" || isBusy}
                onClick={() => onPlay(r, c)}
                className={`relative aspect-square rounded-lg border text-lg font-black transition ${
                  cell === "X"
                    ? "bg-fuchsia-500/35 border-fuchsia-300/50 text-fuchsia-100"
                    : cell === "O"
                      ? "bg-cyan-500/35 border-cyan-300/50 text-cyan-100"
                      : "bg-white/[0.03] border-white/10 text-slate-600 hover:border-emerald-400/40 hover:bg-emerald-500/10"
                } ${isWinCell ? "z-10 scale-105 border-yellow-300 bg-yellow-500/30 shadow-[0_0_20px_rgba(250,204,21,0.45)]" : ""} disabled:cursor-default`}
                aria-label={cell === "empty" ? "Play here" : cell}
              >
                {isWinCell ? (
                  <span
                    className="pointer-events-none absolute inset-0 flex items-center justify-center"
                    aria-hidden
                  >
                    <span className="h-[3px] w-[130%] rotate-[-24deg] rounded-full bg-yellow-300/95" />
                  </span>
                ) : null}
                <span className={isWinCell ? "relative z-10" : ""}>{cell === "empty" ? "" : cell}</span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
