import { describe, expect, it } from "vitest";
import type { Grid646GameView } from "@/lib/grid646";
import {
  canCloseCasualIdle,
  casualIdleDeadline,
  formatIdleCountdown,
  secondsUntilCasualClose,
} from "@/lib/grid646Timeouts";

const baseGame: Grid646GameView = {
  gameId: BigInt(1),
  playerX: "0x0000000000000000000000000000000000000001",
  playerO: "0x0000000000000000000000000000000000000002",
  stakeWei: BigInt(0),
  status: "active",
  winner: "0x0000000000000000000000000000000000000000",
  turn: 0,
  xMask: BigInt(0),
  oMask: BigInt(0),
  lastMoveAt: 1000,
};

describe("grid646Timeouts", () => {
  it("deadline is lastMoveAt + 1h", () => {
    expect(casualIdleDeadline(baseGame)).toBe(1000 + 3600);
  });

  it("allows close only for casual open/active after timeout", () => {
    expect(canCloseCasualIdle(baseGame, 4599)).toBe(false);
    expect(canCloseCasualIdle(baseGame, 4600)).toBe(true);
    expect(canCloseCasualIdle({ ...baseGame, stakeWei: BigInt(1) }, 5000)).toBe(false);
    expect(canCloseCasualIdle({ ...baseGame, status: "finished" }, 5000)).toBe(false);
  });

  it("formats countdown", () => {
    expect(formatIdleCountdown(0)).toBe("now");
    expect(formatIdleCountdown(90)).toBe("1m 30s");
  });

  it("seconds until close", () => {
    expect(secondsUntilCasualClose(baseGame, 2000)).toBe(2600);
    expect(secondsUntilCasualClose(baseGame, 5000)).toBe(0);
  });
});
