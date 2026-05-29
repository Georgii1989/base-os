"use client";

import { useId } from "react";
import type { BoardCoord } from "@/lib/grid646Logic";
import type { CellMark } from "@/lib/grid646";

function WinLineOverlay({ line }: { line: BoardCoord[] | null }) {
  const uid = useId().replace(/:/g, "");
  if (!line || line.length < 2) return null;
  const first = line[0]!;
  const last = line[line.length - 1]!;
  const cellPct = 100 / 6;
  const x1 = first.col * cellPct + cellPct / 2;
  const y1 = first.row * cellPct + cellPct / 2;
  const x2 = last.col * cellPct + cellPct / 2;
  const y2 = last.row * cellPct + cellPct / 2;
  const gradId = `grid646-win-grad-${uid}`;
  const glowId = `grid646-win-glow-${uid}`;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#fff" />
          <stop offset="100%" stopColor="#fde047" />
        </linearGradient>
        <filter id={glowId}>
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={`url(#${gradId})`}
        strokeWidth="2.8"
        strokeLinecap="round"
        filter={`url(#${glowId})`}
        className="grid646-win-beam"
      />
    </svg>
  );
}

export function Grid646Board({
  board,
  winningKeys,
  winningLine,
  disabled,
  isBusy,
  onPlay,
  showLockedHint,
}: {
  board: CellMark[][];
  winningKeys: Set<string>;
  winningLine: BoardCoord[] | null;
  disabled: boolean;
  isBusy: boolean;
  onPlay: (row: number, col: number) => void;
  showLockedHint?: boolean;
}) {
  return (
    <section className="grid646-board-wrap relative rounded-3xl p-3 sm:p-4">
      {showLockedHint ? (
        <p className="mb-3 text-center font-mono text-[10px] uppercase tracking-wider text-cyan-200/70">
          Board locked · waiting for 1/1
        </p>
      ) : null}

      <div className="relative mx-auto max-w-[22rem]">
        <WinLineOverlay line={winningLine} />
        <div
          className="grid646-board-grid relative grid gap-1.5 sm:gap-2"
          style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}
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
                  className={[
                    "grid646-cell relative aspect-square rounded-xl border-2 text-xl font-black transition sm:text-2xl",
                    cell === "empty"
                      ? "grid646-cell-empty border-cyan-400/25 bg-[#0f1428]/90 text-transparent hover:border-fuchsia-400/50 hover:bg-fuchsia-500/10 hover:shadow-[0_0_16px_rgba(236,72,153,0.25)]"
                      : cell === "X"
                        ? "grid646-cell-x border-fuchsia-300/70 bg-fuchsia-500/25 text-fuchsia-100"
                        : "grid646-cell-o border-cyan-300/70 bg-cyan-500/20 text-cyan-100",
                    isWinCell ? "grid646-cell-win z-10 scale-110" : "",
                    "disabled:cursor-default",
                  ].join(" ")}
                  aria-label={cell === "empty" ? "Play here" : cell}
                >
                  {isWinCell ? <span className="grid646-win-sparkle pointer-events-none" aria-hidden /> : null}
                  <span className={isWinCell ? "relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]" : ""}>
                    {cell === "empty" ? "" : cell}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
