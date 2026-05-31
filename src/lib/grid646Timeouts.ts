import { isFreeStake, type Grid646GameView } from "@/lib/grid646";

/** Matches Grid646.sol CASUAL_INACTIVITY_TIMEOUT */
export const CASUAL_INACTIVITY_SEC = 3600;

export function casualIdleDeadline(game: Pick<Grid646GameView, "lastMoveAt">): number {
  return game.lastMoveAt + CASUAL_INACTIVITY_SEC;
}

export function canCloseCasualIdle(
  game: Pick<Grid646GameView, "stakeWei" | "status" | "lastMoveAt">,
  nowSec: number
): boolean {
  if (!isFreeStake(game.stakeWei)) return false;
  if (game.status !== "open" && game.status !== "active") return false;
  return nowSec >= casualIdleDeadline(game);
}

export function secondsUntilCasualClose(
  game: Pick<Grid646GameView, "lastMoveAt">,
  nowSec: number
): number {
  return Math.max(0, casualIdleDeadline(game) - nowSec);
}

export function formatIdleCountdown(seconds: number): string {
  if (seconds <= 0) return "now";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  }
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
