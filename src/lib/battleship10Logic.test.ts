import { describe, expect, it } from "vitest";
import { FLEET_LENGTHS } from "@/lib/battleship10";
import {
  randomFleet,
  shipsToMask,
  validateFleet,
} from "@/lib/battleship10Logic";

describe("battleship10Logic", () => {
  it("validates classic fleet lengths", () => {
    const ships = randomFleet();
    expect(validateFleet(ships)).toBeNull();
    expect(ships.map((s) => s.length).sort()).toEqual([...FLEET_LENGTHS].sort());
  });

  it("shipsToMask has 17 bits", () => {
    const ships = randomFleet();
    const mask = shipsToMask(ships);
    let count = 0;
    let m = mask;
    while (m > BigInt(0)) {
      m &= m - BigInt(1);
      count++;
    }
    expect(count).toBe(17);
  });

  it("rejects overlap", () => {
    const err = validateFleet([
      { row: 0, col: 0, length: 5, horizontal: true },
      { row: 0, col: 4, length: 4, horizontal: true },
      { row: 2, col: 0, length: 3, horizontal: true },
      { row: 4, col: 0, length: 3, horizontal: true },
      { row: 6, col: 0, length: 2, horizontal: true },
    ]);
    expect(err).toBe("Ships overlap");
  });

  it("rejects touching ships", () => {
    const err = validateFleet([
      { row: 0, col: 0, length: 5, horizontal: true },
      { row: 0, col: 8, length: 4, horizontal: false },
      { row: 0, col: 9, length: 3, horizontal: false },
      { row: 5, col: 0, length: 3, horizontal: true },
      { row: 9, col: 0, length: 2, horizontal: true },
    ]);
    expect(err).toBe("Ships too close — leave 1 cell gap");
  });
});
