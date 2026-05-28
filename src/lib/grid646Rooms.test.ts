import { describe, expect, it } from "vitest";
import {
  parseGetGameResult,
  recentRoomIds,
  roomOccupancy,
  ZERO_ADDRESS,
} from "@/lib/grid646Rooms";

describe("grid646Rooms", () => {
  it("recentRoomIds returns latest ids first", () => {
    expect(recentRoomIds(BigInt(1))).toEqual([]);
    expect(recentRoomIds(BigInt(4), 10)).toEqual([BigInt(3), BigInt(2), BigInt(1)]);
  });

  it("roomOccupancy reflects O seat", () => {
    const openWaiting = parseGetGameResult(BigInt(1), [
      "0x0000000000000000000000000000000000000001",
      ZERO_ADDRESS,
      BigInt(0),
      0,
      ZERO_ADDRESS,
      0,
      BigInt(0),
      BigInt(0),
      0,
    ]);
    expect(roomOccupancy(openWaiting)).toBe("1/0");

    const active = parseGetGameResult(BigInt(2), [
      "0x0000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000002",
      BigInt(0),
      1,
      ZERO_ADDRESS,
      0,
      BigInt(0),
      BigInt(0),
      0,
    ]);
    expect(roomOccupancy(active)).toBe("1/1");
  });
});
