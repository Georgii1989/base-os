import { describe, expect, it } from "vitest";
import { emptyBoard, hasWin, playLocalMove } from "@/lib/grid646Logic";

describe("grid646Logic", () => {
  it("detects horizontal win on 4th stone", () => {
    let b = emptyBoard();
    for (let c = 0; c < 3; c++) {
      const r = playLocalMove(b, 0, c, "X");
      if ("error" in r) throw new Error(r.error);
      expect(r.winner).toBeNull();
      b = r.board;
    }
    const last = playLocalMove(b, 0, 3, "X");
    if ("error" in last) throw new Error(last.error);
    expect(last.winner).toBe("X");
  });

  it("rejects taken cell", () => {
    let b = emptyBoard();
    const a = playLocalMove(b, 1, 1, "X");
    if ("error" in a) throw new Error(a.error);
    const b2 = playLocalMove(a.board, 1, 1, "O");
    expect("error" in b2).toBe(true);
  });
});
