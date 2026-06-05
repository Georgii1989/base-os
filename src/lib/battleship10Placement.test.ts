import { describe, expect, it } from "vitest";
import {
  shipFromDrag,
  shipFromDragWithLength,
  tryPlaceShip,
} from "@/lib/battleship10Placement";

describe("battleship10Placement", () => {
  it("builds horizontal ship from drag", () => {
    expect(shipFromDrag({ row: 2, col: 1 }, { row: 2, col: 5 })).toEqual({
      cells: [
        { row: 2, col: 1 },
        { row: 2, col: 2 },
        { row: 2, col: 3 },
        { row: 2, col: 4 },
        { row: 2, col: 5 },
      ],
    });
  });

  it("builds vertical ship from drag", () => {
    expect(shipFromDrag({ row: 0, col: 3 }, { row: 3, col: 3 })).toEqual({
      cells: [
        { row: 0, col: 3 },
        { row: 1, col: 3 },
        { row: 2, col: 3 },
        { row: 3, col: 3 },
      ],
    });
  });

  it("requires exact length when dragging with selected size", () => {
    expect(
      shipFromDragWithLength({ row: 0, col: 0 }, { row: 0, col: 3 }, 5)
    ).toBeNull();
    expect(
      shipFromDragWithLength({ row: 0, col: 0 }, { row: 0, col: 4 }, 5)
    ).not.toBeNull();
  });

  it("places ship when valid", () => {
    const ship = {
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
        { row: 0, col: 4 },
      ],
    };
    const result = tryPlaceShip([], [5, 4, 3, 3, 2], ship);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.placed).toHaveLength(1);
      expect(result.remaining).toEqual([4, 3, 3, 2]);
    }
  });
});
