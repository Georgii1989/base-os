import { describe, expect, it } from "vitest";
import { computeStatsFromTxList } from "./basescanAccountTx";

const W = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"; // lowercase hex

describe("computeStatsFromTxList", () => {
  it("counts only outgoing txs", () => {
    const rows = [
      { from: "0xF39Fd6e51aad88F6F4ce6aB8827279cffFb92266", to: "" },
      { from: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", to: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" },
      {
        from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        to: "0x0000000000000000000000000000000000000001",
      },
    ];
    expect(computeStatsFromTxList(rows, W)).toEqual({
      deployments: 1,
      uniqueSendTargets: 1,
      txsAnalyzed: 2,
    });
  });

  it("ignores invalid to on outgoing", () => {
    expect(
      computeStatsFromTxList([{ from: W, to: "not-an-address" }, { from: W, to: "" }], W)
    ).toEqual({
      deployments: 1,
      uniqueSendTargets: 0,
      txsAnalyzed: 2,
    });
  });
});
