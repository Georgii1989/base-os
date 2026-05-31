import {
  FLEET_LENGTHS,
  GRID_SIZE,
  type ShipPlacement,
} from "@/lib/battleship10";

export function shipsToMask(ships: readonly ShipPlacement[]): bigint {
  let mask = BigInt(0);
  for (const s of ships) {
    for (let i = 0; i < s.length; i++) {
      const r = s.horizontal ? s.row : s.row + i;
      const c = s.horizontal ? s.col + i : s.col;
      const idx = r * GRID_SIZE + c;
      mask |= BigInt(1) << BigInt(idx);
    }
  }
  return mask;
}

export function validateFleet(ships: readonly ShipPlacement[]): string | null {
  if (ships.length !== 5) return "Need exactly 5 ships";
  const lengths = ships.map((s) => s.length).sort((a, b) => a - b);
  const expected = [...FLEET_LENGTHS].sort((a, b) => a - b);
  for (let i = 0; i < 5; i++) {
    if (lengths[i] !== expected[i]) return "Fleet must be 5, 4, 3, 3, 2";
  }
  let mask = BigInt(0);
  for (const s of ships) {
    if (s.length < 2 || s.length > 5) return "Invalid ship length";
    for (let i = 0; i < s.length; i++) {
      const r = s.horizontal ? s.row : s.row + i;
      const c = s.horizontal ? s.col + i : s.col;
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return "Ship out of bounds";
      const bit = BigInt(1) << BigInt(r * GRID_SIZE + c);
      if ((mask & bit) !== BigInt(0)) return "Ships overlap";
      mask |= bit;
    }
  }
  return null;
}

export function canAddShipToFleet(
  placed: readonly ShipPlacement[],
  ship: ShipPlacement
): boolean {
  if (placed.length >= 5) return false;
  if (ship.length < 2 || ship.length > 5) return false;
  let mask = shipsToMask(placed);
  for (let i = 0; i < ship.length; i++) {
    const r = ship.horizontal ? ship.row : ship.row + i;
    const c = ship.horizontal ? ship.col + i : ship.col;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
    const bit = BigInt(1) << BigInt(r * GRID_SIZE + c);
    if ((mask & bit) !== BigInt(0)) return false;
    mask |= bit;
  }
  return true;
}

export function canPlaceShip(
  ships: readonly ShipPlacement[],
  ship: ShipPlacement
): boolean {
  return canAddShipToFleet(ships, ship);
}

export function randomFleet(maxAttempts = 500): ShipPlacement[] {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const lengths = [...FLEET_LENGTHS];
    const placed: ShipPlacement[] = [];
    let ok = true;
    for (const length of lengths) {
      let placedOne = false;
      for (let tryN = 0; tryN < 80; tryN++) {
        const horizontal = Math.random() < 0.5;
        const row = Math.floor(Math.random() * GRID_SIZE);
        const col = Math.floor(Math.random() * GRID_SIZE);
        const ship: ShipPlacement = { row, col, length, horizontal };
        if (canAddShipToFleet(placed, ship)) {
          placed.push(ship);
          placedOne = true;
          break;
        }
      }
      if (!placedOne) {
        ok = false;
        break;
      }
    }
    if (ok && validateFleet(placed) === null) return placed;
  }
  throw new Error("Could not generate random fleet");
}

/** Cells of a single ship segment */
export function shipCells(ship: ShipPlacement): { row: number; col: number }[] {
  const out: { row: number; col: number }[] = [];
  for (let i = 0; i < ship.length; i++) {
    out.push({
      row: ship.horizontal ? ship.row : ship.row + i,
      col: ship.horizontal ? ship.col + i : ship.col,
    });
  }
  return out;
}

/** Ship is sunk when all its cells are in shotsMask */
export function isShipSunk(ship: ShipPlacement, shotsMask: bigint): boolean {
  return shipCells(ship).every(({ row, col }) => {
    const bit = BigInt(1) << BigInt(row * GRID_SIZE + col);
    return (shotsMask & bit) !== BigInt(0);
  });
}

export type OpponentCellView = "unknown" | "miss" | "hit";

export function opponentCellView(
  shotsMask: bigint,
  hitsMask: bigint,
  row: number,
  col: number
): OpponentCellView {
  const bit = BigInt(1) << BigInt(row * GRID_SIZE + col);
  if ((shotsMask & bit) === BigInt(0)) return "unknown";
  return (hitsMask & bit) !== BigInt(0) ? "hit" : "miss";
}

export type OwnCellView = "water" | "ship" | "miss" | "hit";

export function ownCellView(
  myShips: bigint,
  enemyShots: bigint,
  enemyHits: bigint,
  row: number,
  col: number
): OwnCellView {
  const bit = BigInt(1) << BigInt(row * GRID_SIZE + col);
  const ship = (myShips & bit) !== BigInt(0);
  const shot = (enemyShots & bit) !== BigInt(0);
  const hit = (enemyHits & bit) !== BigInt(0);
  if (ship && hit) return "hit";
  if (ship) return "ship";
  if (shot) return "miss";
  return "water";
}
