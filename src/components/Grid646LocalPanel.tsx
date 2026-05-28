"use client";

import { useMemo, useState } from "react";
import { buildBoard, type CellMark } from "@/lib/grid646";
import { emptyBoard, playLocalMove } from "@/lib/grid646Logic";

function CellButton({
  cell,
  disabled,
  onClick,
}: {
  cell: CellMark;
  disabled: boolean;
  onClick: () => void;
}) {
  const filled =
    cell === "X"
      ? "bg-fuchsia-500/35 border-fuchsia-300/50 text-fuchsia-100"
      : cell === "O"
        ? "bg-cyan-500/35 border-cyan-300/50 text-cyan-100"
        : "bg-white/[0.03] border-white/10 text-slate-600 hover:border-emerald-400/40 hover:bg-emerald-500/10";

  return (
    <button
      type="button"
      disabled={disabled || cell !== "empty"}
      onClick={onClick}
      className={`aspect-square rounded-lg border text-lg font-black transition ${filled} disabled:cursor-default`}
    >
      {cell === "empty" ? "" : cell}
    </button>
  );
}

export function Grid646LocalPanel() {
  const [board, setBoard] = useState(emptyBoard);
  const [turn, setTurn] = useState<0 | 1>(0);
  const [winner, setWinner] = useState<"X" | "O" | null>(null);
  const [draw, setDraw] = useState(false);

  const grid = useMemo(() => buildBoard(board.xMask, board.oMask), [board]);
  const gameOver = winner != null || draw;
  const currentMark = turn === 0 ? "X" : "O";

  function handleCell(row: number, col: number) {
    if (gameOver) return;
    const result = playLocalMove(board, row, col, currentMark);
    if ("error" in result) return;
    setBoard(result.board);
    if (result.winner) {
      setWinner(result.winner);
      return;
    }
    if (result.draw) {
      setDraw(true);
      return;
    }
    setTurn(turn === 0 ? 1 : 0);
  }

  function reset() {
    setBoard(emptyBoard());
    setTurn(0);
    setWinner(null);
    setDraw(false);
  }

  return (
    <section className="rounded-3xl border border-slate-400/25 bg-slate-500/10 p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-300">Casual</p>
      <p className="mt-2 text-sm text-slate-300">
        Two players, one screen — no wallet, no gas. X moves first.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="font-bold text-white">
          {gameOver
            ? draw
              ? "Draw"
              : `${winner} wins`
            : `Turn: ${currentMark}`}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-white/10"
        >
          New game
        </button>
      </div>

      <div
        className="mx-auto mt-4 grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(6, minmax(0, 1fr))`, maxWidth: "22rem" }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <CellButton
              key={`${r}-${c}`}
              cell={cell}
              disabled={gameOver}
              onClick={() => handleCell(r, c)}
            />
          ))
        )}
      </div>
    </section>
  );
}
