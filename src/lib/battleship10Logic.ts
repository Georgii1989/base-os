import {
  FLEET_LENGTHS,
  GRID_SIZE,
  type ShipPlacement,
} from "@/lib/battleship10";
import {
  isOrthogonallyConnected,
  shipCells,
  shipLength,
  shipMaskCells,
  straightShip,
} from "@/lib/battleship10Ship";

export function shipsToMask(ships: readonly ShipPlacement[]): bigint {
  let mask = BigInt(0);
  for (const s of ships) {
    mask |= shipMaskCells(s.cells);
  }
  return mask;
}

/** Cells adjacent (8-neighborhood) to any ship cell — cannot be occupied by another ship. */
export function neighborBlockMask(shipMask: bigint): bigint {
  let block = BigInt(0);
  for (let idx = 0; idx < GRID_SIZE * GRID_SIZE; idx++) {
    const bit = BigInt(1) << BigInt(idx);
    if ((shipMask & bit) === BigInt(0)) continue;
    const r = Math.floor(idx / GRID_SIZE);
    const c = idx % GRID_SIZE;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          block |= BigInt(1) << BigInt(nr * GRID_SIZE + nc);
        }
      }
    }
  }
  return block;
}

function validateShipCells(
  placed: readonly ShipPlacement[],
  cells: readonly { row: number; col: number }[]
): string | null {
  if (cells.length < 2 || cells.length > 5) return "Invalid ship length";
  if (!isOrthogonallyConnected(cells)) return "Ship cells must connect (snake path)";

  let mask = shipsToMask(placed);
  let block = neighborBlockMask(mask);

  for (const { row, col } of cells) {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return "Ship out of bounds";
    const bit = BigInt(1) << BigInt(row * GRID_SIZE + col);
    if ((mask & bit) !== BigInt(0)) return "Ships overlap";
    if ((block & bit) !== BigInt(0)) return "Ships too close — leave 1 cell gap";
  }
  return null;
}

export function shipPlacementError(
  placed: readonly ShipPlacement[],
  ship: ShipPlacement
): string | null {
  if (placed.length >= 5) return "Fleet is full";
  return validateShipCells(placed, ship.cells);
}

export function validateFleet(ships: readonly ShipPlacement[]): string | null {
  if (ships.length !== 5) return "Need exactly 5 ships";
  const lengths = ships.map(shipLength).sort((a, b) => a - b);
  const expected = [...FLEET_LENGTHS].sort((a, b) => a - b);
  for (let i = 0; i < 5; i++) {
    if (lengths[i] !== expected[i]) return "Fleet must be 5, 4, 3, 3, 2";
  }

  let mask = BigInt(0);
  let block = BigInt(0);
  for (const s of ships) {
    if (!isOrthogonallyConnected(s.cells)) return "Ship cells must connect (snake path)";
    for (const { row, col } of s.cells) {
      if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return "Ship out of bounds";
      const bit = BigInt(1) << BigInt(row * GRID_SIZE + col);
      if ((mask & bit) !== BigInt(0)) return "Ships overlap";
      if ((block & bit) !== BigInt(0)) return "Ships too close — leave 1 cell gap";
    }
    const sm = shipMaskCells(s.cells);
    mask |= sm;
    block |= neighborBlockMask(sm);
  }
  return null;
}

export function canAddShipToFleet(
  placed: readonly ShipPlacement[],
  ship: ShipPlacement
): boolean {
  return shipPlacementError(placed, ship) === null;
}

export function canPlaceShip(
  ships: readonly ShipPlacement[],
  ship: ShipPlacement
): boolean {
  return canAddShipToFleet(ships, ship);
}

const ORTHO = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

function randomSnakeShip(
  length: number,
  occupied: bigint,
  block: bigint,
  maxTries = 100
): ShipPlacement | null {
  for (let t = 0; t < maxTries; t++) {
    const startRow = Math.floor(Math.random() * GRID_SIZE);
    const startCol = Math.floor(Math.random() * GRID_SIZE);
    const startBit = BigInt(1) << BigInt(startRow * GRID_SIZE + startCol);
    if ((occupied & startBit) !== BigInt(0) || (block & startBit) !== BigInt(0)) continue;

    const cells: { row: number; col: number }[] = [{ row: startRow, col: startCol }];
    let shipMask = startBit;

    let ok = true;
    for (let step = 1; step < length; step++) {
      const neighbors: { row: number; col: number }[] = [];
      const tail = cells[cells.length - 1]!;
      for (const [dr, dc] of ORTHO) {
        const nr = tail.row + dr;
        const nc = tail.col + dc;
        if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
        const bit = BigInt(1) << BigInt(nr * GRID_SIZE + nc);
        if ((occupied & bit) !== BigInt(0)) continue;
        if ((block & bit) !== BigInt(0)) continue;
        if ((shipMask & bit) !== BigInt(0)) continue;
        neighbors.push({ row: nr, col: nc });
      }
      if (neighbors.length === 0) {
        ok = false;
        break;
      }
      const pick = neighbors[Math.floor(Math.random() * neighbors.length)]!;
      cells.push(pick);
      shipMask |= BigInt(1) << BigInt(pick.row * GRID_SIZE + pick.col);
    }

    if (ok && cells.length === length) return { cells };
  }
  return null;
}

function randomStraightShip(
  length: number,
  occupied: bigint,
  block: bigint,
  maxTries = 80
): ShipPlacement | null {
  for (let t = 0; t < maxTries; t++) {
    const horizontal = Math.random() < 0.5;
    const row = Math.floor(Math.random() * GRID_SIZE);
    const col = Math.floor(Math.random() * GRID_SIZE);
    const ship = straightShip(row, col, length, horizontal);
    if (validateShipCellsFromMask(occupied, block, ship.cells) === null) return ship;
  }
  return null;
}

function validateShipCellsFromMask(
  occupied: bigint,
  block: bigint,
  cells: readonly { row: number; col: number }[]
): string | null {
  for (const { row, col } of cells) {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return "oob";
    const bit = BigInt(1) << BigInt(row * GRID_SIZE + col);
    if ((occupied & bit) !== BigInt(0)) return "overlap";
    if ((block & bit) !== BigInt(0)) return "touch";
  }
  return null;
}

export function randomFleet(
  maxAttempts = 600,
  opts?: { snakes?: boolean }
): ShipPlacement[] {
  const allowSnakes = opts?.snakes ?? true;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const lengths = [...FLEET_LENGTHS];
    const placed: ShipPlacement[] = [];
    let mask = BigInt(0);
    let block = BigInt(0);
    let ok = true;

    for (const length of lengths) {
      const snakeFirst = allowSnakes && Math.random() < 0.7;
      const ship =
        (snakeFirst ? randomSnakeShip(length, mask, block) : null) ??
        randomStraightShip(length, mask, block) ??
        randomSnakeShip(length, mask, block) ??
        randomStraightShip(length, mask, block);

      if (!ship) {
        ok = false;
        break;
      }
      const sm = shipMaskCells(ship.cells);
      mask |= sm;
      block |= neighborBlockMask(sm);
      placed.push(ship);
    }

    if (ok && validateFleet(placed) === null) return placed;
  }
  throw new Error("Could not generate random fleet");
}

export { shipCells };

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
