import { describe, expect, it } from "vitest";
import {
  isCoinbaseLikeConnector,
  pickPreferredConnector,
} from "@/lib/walletConnectors";
import type { Connector } from "wagmi";

function mockConnector(partial: { id: string; name: string; type?: string }): Connector {
  return {
    id: partial.id,
    name: partial.name,
    type: (partial.type ?? "injected") as Connector["type"],
  } as Connector;
}

describe("pickPreferredConnector", () => {
  it("prefers Rabby and ignores Coinbase", () => {
    const picked = pickPreferredConnector([
      mockConnector({ id: "baseAccount", name: "Base Account" }),
      mockConnector({ id: "com.coinbase.wallet", name: "Coinbase Wallet" }),
      mockConnector({ id: "io.rabby", name: "Rabby Wallet" }),
    ]);
    expect(picked?.name).toBe("Rabby Wallet");
  });

  it("falls back to MetaMask when Rabby missing", () => {
    const picked = pickPreferredConnector([
      mockConnector({ id: "baseAccount", name: "Coinbase Smart Wallet" }),
      mockConnector({ id: "io.metamask", name: "MetaMask" }),
    ]);
    expect(picked?.name).toBe("MetaMask");
  });

  it("ignores Base Account on normal web when Rabby exists", () => {
    const picked = pickPreferredConnector([
      mockConnector({ id: "baseAccount", name: "Base Account" }),
      mockConnector({ id: "io.rabby", name: "Rabby Wallet" }),
    ]);
    expect(picked?.name).toBe("Rabby Wallet");
  });
});

describe("isCoinbaseLikeConnector", () => {
  it("detects Coinbase Smart Wallet", () => {
    expect(
      isCoinbaseLikeConnector(mockConnector({ id: "x", name: "Coinbase Smart Wallet" }))
    ).toBe(true);
  });
});
