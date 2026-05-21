import { describe, expect, it } from "vitest";
import { computeTopProtocolsFromTxList } from "@/lib/identityCardCompute";

const W = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

describe("computeTopProtocolsFromTxList", () => {
  it("ranks outgoing recipients by count", () => {
    const usdc = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    const other = "0x0000000000000000000000000000000000000001";
    const hits = computeTopProtocolsFromTxList(
      [
        { from: W, to: usdc, input: "0xabcd" },
        { from: W, to: usdc, input: "0xabcd" },
        { from: W, to: other, input: "0x" },
        { from: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8", to: W, input: "0x" },
      ],
      W,
      5
    );
    expect(hits[0]?.label).toBe("USDC");
    expect(hits[0]?.txs).toBe(2);
    expect(hits).toHaveLength(2);
  });
});
