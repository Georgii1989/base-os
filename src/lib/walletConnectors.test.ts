import { describe, expect, it } from "vitest";
import { pickPreferredConnector } from "@/lib/walletConnectors";
import type { Connector } from "wagmi";

function mockConnector(partial: { id: string; name: string; type?: string }): Connector {
  return {
    id: partial.id,
    name: partial.name,
    type: (partial.type ?? "injected") as Connector["type"],
  } as Connector;
}

describe("pickPreferredConnector", () => {
  it("prefers Rabby over Base Account", () => {
    const picked = pickPreferredConnector([
      mockConnector({ id: "baseAccount", name: "Base Account", type: "injected" }),
      mockConnector({ id: "io.rabby", name: "Rabby Wallet" }),
    ]);
    expect(picked?.name).toBe("Rabby Wallet");
  });

  it("prefers MetaMask over Base Account", () => {
    const picked = pickPreferredConnector([
      mockConnector({ id: "baseAccount", name: "Coinbase Wallet" }),
      mockConnector({ id: "io.metamask", name: "MetaMask" }),
    ]);
    expect(picked?.name).toBe("MetaMask");
  });
});
