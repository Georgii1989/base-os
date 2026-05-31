import { describe, expect, it } from "vitest";
import {
  shipFromDrag,
  shipFromDragWithLength,
  tryPlaceShip,
} from "@/lib/battleship10Placement";

describe("battleship10Placement", () => {
  it("builds horizontal ship from drag", () => {
    expect(shipFromDrag({ row: 2, col: 1 }, { row: 2, col: 5 })).toEqual({
      row: 2,
      col: 1,
      length: 5,
      horizontal: true,
    });
  });

  it("builds vertical ship from drag", () => {
    expect(shipFromDrag({ row: 0, col: 3 }, { row: 3, col: 3 })).toEqual({
      row: 0,
      col: 3,
      length: 4,
      horizontal: false,
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
    const ship = { row: 0, col: 0, length: 5, horizontal: true };
    const result = tryPlaceShip([], [5, 4, 3, 3, 2], ship);
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.placed).toHaveLength(1);
      expect(result.remaining).toEqual([4, 3, 3, 2]);
    }
  });
});
