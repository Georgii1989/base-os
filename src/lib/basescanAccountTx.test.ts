import { describe, expect, it } from "vitest";
import { computeStatsFromTxList } from "./basescanAccountTx";

describe("computeStatsFromTxList", () => {
  it("counts contract creations and unique recipients", () => {
    const rows = [
      { to: "" },
      { to: "0x0000000000000000000000000000000000000001" },
      { to: "0x0000000000000000000000000000000000000001" },
    ];
    expect(computeStatsFromTxList(rows)).toEqual({
      deployments: 1,
      uniqueSendTargets: 1,
      txsAnalyzed: 3,
    });
  });

  it("ignores invalid to", () => {
    expect(
      computeStatsFromTxList([{ to: "not-an-address" }, { to: "" }])
    ).toEqual({
      deployments: 1,
      uniqueSendTargets: 0,
      txsAnalyzed: 2,
    });
  });
});
