import { describe, expect, it } from "vitest";
import { computeOnchainScoreFromTxList } from "@/lib/onchainScoreCompute";

describe("computeOnchainScoreFromTxList", () => {
  const watcher = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  it("counts outgoing, incoming, and bridge txs", () => {
    const result = computeOnchainScoreFromTxList(
      [
        {
          from: watcher,
          to: "0x49048044d1675761a8a4cA8Cb25bde69dffb7052",
          input: "0xabcd",
          timeStamp: "1700000000",
          isError: "0",
        },
        {
          from: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          to: watcher,
          input: "0x",
          timeStamp: "1700003600",
          isError: "0",
        },
        {
          from: watcher,
          to: "",
          input: "0x",
          timeStamp: "1700007200",
          isError: "0",
        },
      ],
      watcher,
      false,
      5
    );

    expect(result.metrics.outgoingTxs).toBe(2);
    expect(result.metrics.incomingTxs).toBe(1);
    expect(result.metrics.bridgeTxs).toBe(1);
    expect(result.metrics.deployments).toBe(1);
    expect(result.metrics.tokenTransfers).toBe(5);
    expect(result.score).toBeGreaterThan(0);
  });
});
