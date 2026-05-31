"use client";

import { GRID_SIZE } from "@/lib/battleship10";
import {
  opponentCellView,
  ownCellView,
  type OpponentCellView,
  type OwnCellView,
} from "@/lib/battleship10Logic";

function cellClass(view: OpponentCellView | OwnCellView, interactive: boolean): string {
  const base =
    "relative flex aspect-square items-center justify-center rounded-md border text-[10px] font-bold transition sm:text-xs";
  const map: Record<string, string> = {
    unknown: "border-cyan-400/20 bg-slate-900/80 text-slate-600",
    water: "border-slate-600/30 bg-slate-950/60",
    ship: "border-emerald-400/40 bg-emerald-600/35 text-emerald-100",
    miss: "border-slate-500/40 bg-slate-800/70 text-slate-400",
    hit: "border-rose-400/50 bg-rose-600/45 text-rose-100",
  };
  const hover = interactive ? " hover:border-cyan-300/60 hover:bg-cyan-500/15 cursor-pointer" : "";
  return `${base} ${map[view] ?? map.unknown}${hover}`;
}

function cellLabel(view: OpponentCellView | OwnCellView): string {
  if (view === "hit") return "✕";
  if (view === "miss") return "·";
  return "";
}

export function Battleship10BattleBoards({
  myShots,
  myHits,
  myShips,
  enemyShotsAtMe,
  enemyHitsOnMe,
  canFire,
  isBusy,
  onFire,
}: {
  myShots: bigint;
  myHits: bigint;
  myShips: bigint;
  enemyShotsAtMe: bigint;
  enemyHitsOnMe: bigint;
  canFire: boolean;
  isBusy: boolean;
  onFire: (row: number, col: number) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section>
        <h4 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-200/90">
          Your fleet
        </h4>
        <Grid10
          render={(r, c) => ownCellView(myShips, enemyShotsAtMe, enemyHitsOnMe, r, c)}
          interactive={false}
          isBusy={isBusy}
          onCell={() => {}}
        />
      </section>
      <section>
        <h4 className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-200/90">
          Enemy waters
        </h4>
        <Grid10
          render={(r, c) => opponentCellView(myShots, myHits, r, c)}
          interactive={canFire}
          isBusy={isBusy}
          onCell={onFire}
        />
      </section>
    </div>
  );
}

export function Battleship10PlacementPreview({
  shipsMask,
  onShuffle,
  disabled,
}: {
  shipsMask: bigint;
  onShuffle: () => void;
  disabled?: boolean;
}) {
  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/90">
          Fleet preview
        </h4>
        <button
          type="button"
          disabled={disabled}
          onClick={onShuffle}
          className="rounded-lg border border-amber-300/35 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-100 disabled:opacity-50"
        >
          Shuffle layout
        </button>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Classic fleet: 5 + 4 + 3 + 3 + 2 cells. Confirm sends one on-chain placement tx.
      </p>
      <Grid10
        render={(r, c) => {
          const bit = BigInt(1) << BigInt(r * GRID_SIZE + c);
          return (shipsMask & bit) !== BigInt(0) ? "ship" : "water";
        }}
        interactive={false}
        isBusy={false}
        onCell={() => {}}
      />
    </section>
  );
}

function Grid10({
  render,
  interactive,
  isBusy,
  onCell,
}: {
  render: (row: number, col: number) => OpponentCellView | OwnCellView;
  interactive: boolean;
  isBusy: boolean;
  onCell: (row: number, col: number) => void;
}) {
  return (
    <div
      className="grid gap-0.5 rounded-2xl border border-white/10 bg-slate-950/50 p-2 sm:gap-1 sm:p-3"
      style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
        const row = Math.floor(i / GRID_SIZE);
        const col = i % GRID_SIZE;
        const view = render(row, col);
        const canClick = interactive && view === "unknown";
        return (
          <button
            key={`${row}-${col}`}
            type="button"
            disabled={!canClick || isBusy}
            onClick={() => onCell(row, col)}
            className={cellClass(view, canClick)}
            aria-label={`${row},${col} ${view}`}
          >
            {cellLabel(view)}
          </button>
        );
      })}
    </div>
  );
}
