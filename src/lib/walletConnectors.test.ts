import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isCoinbaseLikeConnector,
  isConnectorProviderAvailable,
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
  beforeEach(() => {
    vi.stubGlobal("window", {
      ethereum: {
        isRabby: true,
        isMetaMask: false,
        request: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefers Rabby and ignores Coinbase", () => {
    const picked = pickPreferredConnector([
      mockConnector({ id: "baseAccount", name: "Base Account" }),
      mockConnector({ id: "com.coinbase.wallet", name: "Coinbase Wallet" }),
      mockConnector({ id: "io.rabby", name: "Rabby Wallet" }),
    ]);
    expect(picked?.name).toBe("Rabby Wallet");
  });

  it("falls back to MetaMask when Rabby missing", () => {
    vi.stubGlobal("window", {
      ethereum: {
        isRabby: false,
        isMetaMask: true,
        request: vi.fn(),
      },
    });
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

  it("skips Rabby connector when extension is not installed", () => {
    vi.stubGlobal("window", {
      ethereum: {
        isRabby: false,
        isMetaMask: true,
        request: vi.fn(),
      },
    });
    const picked = pickPreferredConnector([
      mockConnector({ id: "io.rabby", name: "Rabby Wallet" }),
      mockConnector({ id: "io.metamask", name: "MetaMask" }),
    ]);
    expect(picked?.name).toBe("MetaMask");
  });

  it("uses generic injected when only generic is available", () => {
    vi.stubGlobal("window", {
      ethereum: {
        request: vi.fn(),
      },
    });
    const picked = pickPreferredConnector([
      mockConnector({ id: "io.rabby", name: "Rabby Wallet" }),
      mockConnector({ id: "injected", name: "Injected" }),
    ]);
    expect(picked?.id).toBe("injected");
  });
});

describe("isCoinbaseLikeConnector", () => {
  it("detects Coinbase Smart Wallet", () => {
    expect(
      isCoinbaseLikeConnector(mockConnector({ id: "x", name: "Coinbase Smart Wallet" }))
    ).toBe(true);
  });
});

describe("isConnectorProviderAvailable", () => {
  it("requires Rabby flag for Rabby connector", () => {
    vi.stubGlobal("window", {
      ethereum: { isRabby: false, request: vi.fn() },
    });
    expect(
      isConnectorProviderAvailable(mockConnector({ id: "io.rabby", name: "Rabby Wallet" }))
    ).toBe(false);
  });
});
