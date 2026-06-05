import { GRID_SIZE, type ShipPlacement } from "@/lib/battleship10";

export function shipLength(ship: ShipPlacement): number {
  return ship.cells.length;
}

export function straightShip(
  row: number,
  col: number,
  length: number,
  horizontal: boolean
): ShipPlacement {
  const cells: { row: number; col: number }[] = [];
  for (let i = 0; i < length; i++) {
    cells.push({
      row: horizontal ? row : row + i,
      col: horizontal ? col + i : col,
    });
  }
  return { cells };
}

export function isOrthogonallyConnected(cells: readonly { row: number; col: number }[]): boolean {
  if (cells.length === 0) return false;
  const key = (r: number, c: number) => `${r},${c}`;
  const set = new Set(cells.map(({ row, col }) => key(row, col)));
  const start = cells[0]!;
  const seen = new Set<string>([key(start.row, start.col)]);
  const queue = [start];

  while (queue.length > 0) {
    const { row, col } = queue.shift()!;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      const nr = row + dr;
      const nc = col + dc;
      const k = key(nr, nc);
      if (!set.has(k) || seen.has(k)) continue;
      seen.add(k);
      queue.push({ row: nr, col: nc });
    }
  }
  return seen.size === cells.length;
}

export function shipCells(ship: ShipPlacement): { row: number; col: number }[] {
  return [...ship.cells];
}

export function cellInShip(ship: ShipPlacement, row: number, col: number): boolean {
  return ship.cells.some((c) => c.row === row && c.col === col);
}

export function shipMaskCells(cells: readonly { row: number; col: number }[]): bigint {
  let mask = BigInt(0);
  for (const { row, col } of cells) {
    mask |= BigInt(1) << BigInt(row * GRID_SIZE + col);
  }
  return mask;
}

export function isStraightShip(ship: ShipPlacement): boolean {
  if (ship.cells.length === 0) return false;
  const row0 = ship.cells[0]!.row;
  const col0 = ship.cells[0]!.col;
  const sameRow = ship.cells.every((c) => c.row === row0);
  const sameCol = ship.cells.every((c) => c.col === col0);
  return sameRow || sameCol;
}

export function fleetHasSnake(ships: readonly ShipPlacement[]): boolean {
  return ships.some((s) => !isStraightShip(s));
}

/** Legacy v2 contract: straight ships only. */
export function toStraightContractShips(ships: readonly ShipPlacement[]) {
  return ships.map((s) => {
    const horizontal = s.cells.every((c) => c.row === s.cells[0]!.row);
    const sorted = [...s.cells].sort((a, b) =>
      horizontal ? a.col - b.col : a.row - b.row
    );
    const anchor = sorted[0]!;
    return {
      row: anchor.row,
      col: anchor.col,
      length: s.cells.length,
      horizontal,
    };
  }) as [
    { row: number; col: number; length: number; horizontal: boolean },
    { row: number; col: number; length: number; horizontal: boolean },
    { row: number; col: number; length: number; horizontal: boolean },
    { row: number; col: number; length: number; horizontal: boolean },
    { row: number; col: number; length: number; horizontal: boolean },
  ];
}
