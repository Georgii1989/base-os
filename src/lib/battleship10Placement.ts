import {
  FLEET_LENGTHS,
  GRID_SIZE,
  type ShipPlacement,
} from "@/lib/battleship10";
import { canAddShipToFleet, validateFleet } from "@/lib/battleship10Logic";

export function initialRemainingFleet(): number[] {
  return [...FLEET_LENGTHS];
}

export function shipAtAnchor(
  row: number,
  col: number,
  length: number,
  horizontal: boolean
): ShipPlacement {
  return { row, col, length, horizontal };
}

/** Drag between two cells on same row or column → ship segment. */
export function shipFromDrag(
  start: { row: number; col: number },
  end: { row: number; col: number }
): ShipPlacement | null {
  const dr = end.row - start.row;
  const dc = end.col - start.col;
  if (dr === 0 && dc === 0) return null;
  if (dr !== 0 && dc !== 0) return null;

  if (dr === 0) {
    const length = Math.abs(dc) + 1;
    const col = dc >= 0 ? start.col : end.col;
    const row = start.row;
    if (row < 0 || row >= GRID_SIZE || col < 0 || col + length > GRID_SIZE) return null;
    return { row, col, length, horizontal: true };
  }

  const length = Math.abs(dr) + 1;
  const row = dr >= 0 ? start.row : end.row;
  const col = start.col;
  if (col < 0 || col >= GRID_SIZE || row < 0 || row + length > GRID_SIZE) return null;
  return { row, col, length, horizontal: false };
}

export function tryPlaceShip(
  placed: readonly ShipPlacement[],
  remaining: readonly number[],
  ship: ShipPlacement
): { placed: ShipPlacement[]; remaining: number[] } | { error: string } {
  const idx = remaining.indexOf(ship.length);
  if (idx === -1) {
    return { error: `No size-${ship.length} ship left in dock` };
  }
  if (!canAddShipToFleet(placed, ship)) {
    return { error: "Ship out of bounds or overlaps another" };
  }
  const nextRemaining = [...remaining];
  nextRemaining.splice(idx, 1);
  return { placed: [...placed, ship], remaining: nextRemaining };
}

export function undoLastShip(
  placed: readonly ShipPlacement[],
  remaining: readonly number[]
): { placed: ShipPlacement[]; remaining: number[] } {
  if (placed.length === 0) return { placed: [], remaining: [...remaining] };
  const last = placed[placed.length - 1]!;
  return {
    placed: placed.slice(0, -1),
    remaining: [...remaining, last.length].sort((a, b) => b - a),
  };
}

export function cellShipIndex(
  placed: readonly ShipPlacement[],
  row: number,
  col: number
): number | null {
  for (let i = 0; i < placed.length; i++) {
    const s = placed[i]!;
    for (let j = 0; j < s.length; j++) {
      const r = s.horizontal ? s.row : s.row + j;
      const c = s.horizontal ? s.col + j : s.col;
      if (r === row && c === col) return i;
    }
  }
  return null;
}

export function isFleetComplete(placed: readonly ShipPlacement[]): boolean {
  return validateFleet(placed) === null;
}

export function previewMask(
  placed: readonly ShipPlacement[],
  preview: ShipPlacement | null
): bigint {
  let mask = BigInt(0);
  const all = preview ? [...placed, preview] : placed;
  for (const s of all) {
    for (let i = 0; i < s.length; i++) {
      const r = s.horizontal ? s.row : s.row + i;
      const c = s.horizontal ? s.col + i : s.col;
      mask |= BigInt(1) << BigInt(r * GRID_SIZE + c);
    }
  }
  return mask;
}

/** Preview ship when dragging with a fixed selected length. */
export function shipFromDragWithLength(
  start: { row: number; col: number },
  end: { row: number; col: number },
  length: number
): ShipPlacement | null {
  const raw = shipFromDrag(start, end);
  if (!raw || raw.length !== length) return null;
  return raw;
}
