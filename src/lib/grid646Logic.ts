import { GRID_SIZE, WIN_LEN, cellIndex, type CellMark } from "@/lib/grid646";

export type LocalBoard = { xMask: bigint; oMask: bigint };

export function emptyBoard(): LocalBoard {
  return { xMask: BigInt(0), oMask: BigInt(0) };
}

export function boardFull(xMask: bigint, oMask: bigint): boolean {
  const filled = xMask | oMask;
  return filled === (BigInt(1) << BigInt(36)) - BigInt(1);
}

function testMask(mask: bigint, row: number, col: number): boolean {
  const idx = cellIndex(row, col);
  return ((mask >> BigInt(idx)) & BigInt(1)) === BigInt(1);
}

function rayCount(mask: bigint, row: number, col: number, dr: number, dc: number): number {
  let count = 0;
  let r = row + dr;
  let c = col + dc;
  for (let i = 0; i < WIN_LEN - 1; i++) {
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) break;
    if (!testMask(mask, r, c)) break;
    count++;
    r += dr;
    c += dc;
  }
  return count;
}

function lineCount(mask: bigint, row: number, col: number, dr: number, dc: number): number {
  return 1 + rayCount(mask, row, col, dr, dc) + rayCount(mask, row, col, -dr, -dc);
}

export function hasWin(mask: bigint, row: number, col: number): boolean {
  return (
    lineCount(mask, row, col, 0, 1) >= WIN_LEN ||
    lineCount(mask, row, col, 1, 0) >= WIN_LEN ||
    lineCount(mask, row, col, 1, 1) >= WIN_LEN ||
    lineCount(mask, row, col, 1, -1) >= WIN_LEN
  );
}

export type BoardCoord = { row: number; col: number };

const WIN_DIRS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

/** Four cells that form the winning line (any finished win on the board). */
export function findWinningCells(xMask: bigint, oMask: bigint, mark: "X" | "O"): BoardCoord[] | null {
  const mask = mark === "X" ? xMask : oMask;
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!testMask(mask, row, col)) continue;
      for (const [dr, dc] of WIN_DIRS) {
        if (lineCount(mask, row, col, dr, dc) < WIN_LEN) continue;
        let sr = row;
        let sc = col;
        while (true) {
          const pr = sr - dr;
          const pc = sc - dc;
          if (pr < 0 || pr >= GRID_SIZE || pc < 0 || pc >= GRID_SIZE || !testMask(mask, pr, pc)) {
            break;
          }
          sr = pr;
          sc = pc;
        }
        const cells: BoardCoord[] = [];
        for (let i = 0; i < WIN_LEN; i++) {
          cells.push({ row: sr + dr * i, col: sc + dc * i });
        }
        return cells;
      }
    }
  }
  return null;
}

export function winningCellKeys(cells: BoardCoord[] | null): Set<string> {
  if (!cells) return new Set();
  return new Set(cells.map((c) => `${c.row},${c.col}`));
}

export function playLocalMove(
  board: LocalBoard,
  row: number,
  col: number,
  mark: "X" | "O"
): { board: LocalBoard; winner: "X" | "O" | null; draw: boolean } | { error: string } {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    return { error: "Invalid cell" };
  }
  const bit = BigInt(1) << BigInt(cellIndex(row, col));
  if ((board.xMask | board.oMask) & bit) return { error: "Cell taken" };

  const next =
    mark === "X"
      ? { xMask: board.xMask | bit, oMask: board.oMask }
      : { xMask: board.xMask, oMask: board.oMask | bit };

  const mask = mark === "X" ? next.xMask : next.oMask;
  if (hasWin(mask, row, col)) {
    return { board: next, winner: mark, draw: false };
  }
  if (boardFull(next.xMask, next.oMask)) {
    return { board: next, winner: null, draw: true };
  }
  return { board: next, winner: null, draw: false };
}

export function marksToBoard(cells: CellMark[][]): LocalBoard {
  let xMask = BigInt(0);
  let oMask = BigInt(0);
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const bit = BigInt(1) << BigInt(cellIndex(r, c));
      if (cells[r][c] === "X") xMask |= bit;
      if (cells[r][c] === "O") oMask |= bit;
    }
  }
  return { xMask, oMask };
}
