import { describe, expect, it } from "vitest";
import { buildBoard, cellIndex, getCell } from "@/lib/grid646";

describe("grid646", () => {
  it("cellIndex maps row col", () => {
    expect(cellIndex(2, 3)).toBe(15);
  });

  it("buildBoard reads masks", () => {
    const x = BigInt(1) << BigInt(0);
    const o = BigInt(1) << BigInt(5);
    const board = buildBoard(x, o);
    expect(board[0][0]).toBe("X");
    expect(board[0][5]).toBe("O");
    expect(getCell({ xMask: x, oMask: o }, 1, 1)).toBe("empty");
  });
});
