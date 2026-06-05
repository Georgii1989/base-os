import { describe, expect, it } from "vitest";
import { FLEET_LENGTHS } from "@/lib/battleship10";
import {
  randomFleet,
  shipsToMask,
  validateFleet,
} from "@/lib/battleship10Logic";
import { shipLength, straightShip } from "@/lib/battleship10Ship";

describe("battleship10Logic", () => {
  it("validates classic fleet lengths", () => {
    const ships = randomFleet();
    expect(validateFleet(ships)).toBeNull();
    expect(ships.map(shipLength).sort()).toEqual([...FLEET_LENGTHS].sort());
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
      straightShip(0, 0, 5, true),
      straightShip(0, 4, 4, true),
      straightShip(2, 0, 3, true),
      straightShip(4, 0, 3, true),
      straightShip(6, 0, 2, true),
    ]);
    expect(err).toBe("Ships overlap");
  });

  it("rejects touching ships", () => {
    const err = validateFleet([
      straightShip(0, 0, 5, true),
      straightShip(0, 8, 4, false),
      straightShip(0, 9, 3, false),
      straightShip(5, 0, 3, true),
      straightShip(9, 0, 2, true),
    ]);
    expect(err).toBe("Ships too close — leave 1 cell gap");
  });

  it("accepts snake ship", () => {
    const snake = {
      cells: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ],
    };
    const fleet = [
      snake,
      straightShip(3, 0, 5, true),
      straightShip(5, 0, 3, true),
      straightShip(7, 0, 3, true),
      straightShip(9, 0, 2, true),
    ];
    expect(validateFleet(fleet)).toBeNull();
  });
});
