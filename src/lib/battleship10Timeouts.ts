import { CASUAL_INACTIVITY_SEC } from "@/lib/grid646Timeouts";
import { isFreeStake, type Battleship10GameView } from "@/lib/battleship10";

export function casualIdleDeadline(game: Pick<Battleship10GameView, "lastMoveAt">): number {
  return game.lastMoveAt + CASUAL_INACTIVITY_SEC;
}

export function canCloseCasualIdle(
  game: Pick<Battleship10GameView, "stakeWei" | "status" | "lastMoveAt">,
  nowSec: number
): boolean {
  if (!isFreeStake(game.stakeWei)) return false;
  if (game.status !== "open" && game.status !== "placing" && game.status !== "active") return false;
  return nowSec >= casualIdleDeadline(game);
}

export function secondsUntilCasualClose(
  game: Pick<Battleship10GameView, "lastMoveAt">,
  nowSec: number
): number {
  return Math.max(0, casualIdleDeadline(game) - nowSec);
}

export { formatIdleCountdown } from "@/lib/grid646Timeouts";
