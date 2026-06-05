/** Classic 10×10 Battleship — mirrors Battleship10.sol */

export const GRID_SIZE = 10;
export const GRID_CELLS = 100;
export const FLEET_CELLS = 17;

/** Hasbro fleet: carrier, battleship, cruiser, submarine, destroyer */
export const FLEET_LENGTHS = [5, 4, 3, 3, 2] as const;

export type Battleship10Status = "open" | "placing" | "active" | "finished" | "cancelled";

export const BATTLESHIP10_STATUS: Record<number, Battleship10Status> = {
  0: "open",
  1: "placing",
  2: "active",
  3: "finished",
  4: "cancelled",
};

export type ShipPlacement = {
  cells: readonly { row: number; col: number }[];
};

export type Battleship10GameView = {
  gameId: bigint;
  playerX: `0x${string}`;
  playerO: `0x${string}`;
  stakeWei: bigint;
  status: Battleship10Status;
  winner: `0x${string}`;
  turn: 0 | 1;
  shipsX: bigint;
  shipsO: bigint;
  shotsX: bigint;
  shotsO: bigint;
  hitsX: bigint;
  hitsO: bigint;
  placedX: boolean;
  placedO: boolean;
  lastMoveAt: number;
};

export function cellIndex(row: number, col: number): number {
  return row * GRID_SIZE + col;
}

export function hasBit(mask: bigint, row: number, col: number): boolean {
  const bit = BigInt(1) << BigInt(cellIndex(row, col));
  return (mask & bit) !== BigInt(0);
}

export function isFreeStake(wei: bigint): boolean {
  return wei === BigInt(0);
}

export function formatStakeEth(wei: bigint): string {
  const eth = Number(wei) / 1e18;
  if (eth >= 0.001) return eth.toFixed(4);
  return eth.toFixed(6);
}

export function formatGameStake(wei: bigint): string {
  if (isFreeStake(wei)) return "Free · casual";
  return `${formatStakeEth(wei)} ETH`;
}

export function shortenAddr(addr: string): string {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export { isFreeStake as battleshipIsFreeStake };
