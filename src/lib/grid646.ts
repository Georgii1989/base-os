/** 6×6 four-in-a-row — mirrors Grid646.sol */

export const GRID_SIZE = 6;
export const WIN_LEN = 4;
export const GRID_CELLS = 36;

export type Grid646Status = "open" | "active" | "finished" | "cancelled";

export const GRID646_STATUS: Record<number, Grid646Status> = {
  0: "open",
  1: "active",
  2: "finished",
  3: "cancelled",
};

export type Grid646GameView = {
  gameId: bigint;
  playerX: `0x${string}`;
  playerO: `0x${string}`;
  stakeWei: bigint;
  status: Grid646Status;
  winner: `0x${string}`;
  turn: 0 | 1;
  xMask: bigint;
  oMask: bigint;
  lastMoveAt: number;
};

export type CellMark = "empty" | "X" | "O";

export function cellIndex(row: number, col: number): number {
  return row * GRID_SIZE + col;
}

export function getCell(board: { xMask: bigint; oMask: bigint }, row: number, col: number): CellMark {
  const idx = cellIndex(row, col);
  const bit = BigInt(1) << BigInt(idx);
  if ((board.xMask & bit) !== BigInt(0)) return "X";
  if ((board.oMask & bit) !== BigInt(0)) return "O";
  return "empty";
}

export function buildBoard(xMask: bigint, oMask: bigint): CellMark[][] {
  const rows: CellMark[][] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const line: CellMark[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      line.push(getCell({ xMask, oMask }, r, c));
    }
    rows.push(line);
  }
  return rows;
}

export function isFreeStake(wei: bigint): boolean {
  return wei === BigInt(0);
}

export function formatStakeEth(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  if (eth >= 0.001) return eth.toFixed(4);
  return eth.toFixed(6);
}

/** Stake label for lobby and buttons */
export function grid646JoinUrl(origin: string, gameId: bigint | number): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/?tab=game&join=${String(gameId)}`;
}

export function formatGameStake(wei: bigint): string {
  if (isFreeStake(wei)) return "Free · на интерес";
  return `${formatStakeEth(wei)} ETH`;
}

export function shortenAddr(addr: string): string {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
