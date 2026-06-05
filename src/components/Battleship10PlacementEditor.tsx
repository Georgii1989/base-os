"use client";

import { useMemo, useRef, useState } from "react";
import { type ShipPlacement } from "@/lib/battleship10";
import { resolveBattleship10SupportsMask } from "@/lib/battleship10Abi";
import { randomFleet, validateFleet } from "@/lib/battleship10Logic";
import { shipLength } from "@/lib/battleship10Ship";
import { formatCoord } from "@/lib/battleship10Grid";
import { Battleship10LabeledGrid } from "@/components/Battleship10LabeledGrid";
import {
  cellShipIndex,
  initialRemainingFleet,
  shipAtAnchor,
  shipFromDragWithLength,
  tryPlaceShip,
  undoLastShip,
} from "@/lib/battleship10Placement";

const SHIP_COLORS = [
  "bg-emerald-600/45 border-emerald-300/50",
  "bg-cyan-600/45 border-cyan-300/50",
  "bg-violet-600/45 border-violet-300/50",
  "bg-amber-600/45 border-amber-300/50",
  "bg-rose-600/45 border-rose-300/50",
];

function remainingFromFleet(fleet: readonly ShipPlacement[]): number[] {
  const used = fleet.map(shipLength).sort((a, b) => a - b);
  const pool = initialRemainingFleet().sort((a, b) => a - b);
  const usedCopy = [...used];
  const rem: number[] = [];
  for (const len of pool) {
    const idx = usedCopy.indexOf(len);
    if (idx >= 0) usedCopy.splice(idx, 1);
    else rem.push(len);
  }
  return rem.sort((a, b) => b - a);
}

function cellClassForPlacement(
  shipIdx: number | null,
  isPreview: boolean,
  isDragging: boolean
): string {
  const base =
    "relative flex aspect-square items-center justify-center rounded-md border text-[10px] font-bold transition select-none touch-none sm:text-xs";
  if (shipIdx == null) {
    return `${base} border-slate-600/35 bg-slate-950/70 ${
      isDragging ? "hover:border-cyan-400/40 hover:bg-cyan-500/10" : ""
    }`;
  }
  const color = SHIP_COLORS[shipIdx % SHIP_COLORS.length];
  const preview = isPreview ? " opacity-60 ring-1 ring-white/40" : "";
  return `${base} ${color}${preview}`;
}

type Props = {
  fleet: ShipPlacement[];
  onFleetChange: (ships: ShipPlacement[]) => void;
  disabled?: boolean;
};

export function Battleship10PlacementEditor({ fleet, onFleetChange, disabled }: Props) {
  const supportsMask = resolveBattleship10SupportsMask();
  const remaining = useMemo(() => remainingFromFleet(fleet), [fleet]);
  const [selectedLength, setSelectedLength] = useState(5);
  const [horizontal, setHorizontal] = useState(true);
  const [dragStart, setDragStart] = useState<{ row: number; col: number } | null>(null);
  const [dragEnd, setDragEnd] = useState<{ row: number; col: number } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const skipClickRef = useRef(false);


  const activeLength = remaining.includes(selectedLength)
    ? selectedLength
    : (remaining[0] ?? selectedLength);

  const previewShip = useMemo(() => {
    if (!dragStart || !dragEnd || !remaining.includes(activeLength)) return null;
    return shipFromDragWithLength(dragStart, dragEnd, activeLength);
  }, [dragStart, dragEnd, activeLength, remaining]);

  function commitShip(ship: ShipPlacement) {
    const result = tryPlaceShip(fleet, remaining, ship);
    if ("error" in result) {
      setNote(result.error);
      return;
    }
    setNote(null);
    onFleetChange(result.placed);
  }

  function finishDrag() {
    if (previewShip) {
      commitShip(previewShip);
      skipClickRef.current = true;
    }
    setDragStart(null);
    setDragEnd(null);
  }

  function handleCellClick(row: number, col: number) {
    if (skipClickRef.current) {
      skipClickRef.current = false;
      return;
    }
    if (disabled || dragStart || !remaining.includes(activeLength)) return;
    if (cellShipIndex(fleet, row, col) != null) return;
    commitShip(shipAtAnchor(row, col, activeLength, horizontal));
  }

  function handleShuffle() {
    if (disabled) return;
    onFleetChange(randomFleet(600, { snakes: supportsMask }));
    setNote(null);
    setDragStart(null);
    setDragEnd(null);
  }

  function handleUndo() {
    if (disabled || fleet.length === 0) return;
    onFleetChange(undoLastShip(fleet, remaining).placed);
    setNote(null);
  }

  function handleClear() {
    if (disabled) return;
    onFleetChange([]);
    setNote(null);
  }

  function renderCell(row: number, col: number) {
    const idx = cellShipIndex(fleet, row, col);
    let isPreview = false;
    if (idx == null && previewShip) {
      isPreview = previewShip.cells.some((c) => c.row === row && c.col === col);
    }
    const previewIdx = isPreview ? fleet.length : idx;
    return (
      <button
        type="button"
        disabled={disabled}
        className={`w-full ${cellClassForPlacement(previewIdx, isPreview, Boolean(dragStart))}`}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragStart({ row, col });
          setDragEnd({ row, col });
          setNote(null);
        }}
        onPointerEnter={() => {
          if (dragStart) setDragEnd({ row, col });
        }}
        onPointerUp={() => {
          if (dragStart) finishDrag();
        }}
        onClick={() => handleCellClick(row, col)}
        aria-label={`Place ${formatCoord(row, col)}`}
      />
    );
  }

  const complete = validateFleet(fleet) === null;

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-amber-200/90">
          Place your fleet
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={handleShuffle}
            className="rounded-lg border border-amber-300/35 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-100 disabled:opacity-50"
          >
            Shuffle fleet
          </button>
          <button
            type="button"
            disabled={disabled || fleet.length === 0}
            onClick={handleUndo}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-300 disabled:opacity-50"
          >
            Undo
          </button>
          <button
            type="button"
            disabled={disabled || fleet.length === 0}
            onClick={handleClear}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-bold text-slate-300 disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      <p className="mb-3 text-xs text-slate-500">
        Tap <strong className="text-amber-200/90">Shuffle fleet</strong> until the layout looks good,
        then confirm below. Or place ships manually (drag or tap). Ships can bend like a snake.
        Leave at least 1 empty cell between ships.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Dock</span>
        {remaining.length === 0 ? (
          <span className="text-xs font-bold text-emerald-400/90">All ships placed</span>
        ) : (
          remaining.map((len, i) => (
            <button
              key={`dock-${len}-${i}`}
              type="button"
              disabled={disabled}
              onClick={() => setSelectedLength(len)}
              className={`rounded-lg border px-2.5 py-1 font-mono text-xs font-black ${
                activeLength === len
                  ? "border-cyan-300/60 bg-cyan-500/25 text-cyan-100"
                  : "border-white/15 text-slate-300"
              }`}
            >
              {len}
            </button>
          ))
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setHorizontal((h) => !h)}
          className="ml-auto rounded-lg border border-white/15 px-2.5 py-1 text-xs font-bold text-slate-300"
        >
          {horizontal ? "Horizontal ↔" : "Vertical ↕"}
        </button>
      </div>

      <div
        onPointerLeave={() => {
          if (dragStart) finishDrag();
        }}
      >
        <Battleship10LabeledGrid
          className="rounded-2xl border border-white/10 bg-slate-950/50 p-2 sm:p-3"
          renderCell={(row, col) => renderCell(row, col)}
        />
      </div>

      <p className="mt-2 text-center text-[10px] text-slate-600">
        {complete
          ? "Fleet complete — confirm below when ready"
          : fleet.length === 0
            ? "Empty board — shuffle or place ships manually"
            : `${fleet.length}/5 ships placed`}
      </p>
      {note ? <p className="mt-1 text-center text-xs text-amber-200/90">{note}</p> : null}
    </section>
  );
}
