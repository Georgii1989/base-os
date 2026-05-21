import { baseAccount, injected } from "wagmi/connectors";
import type { Connector } from "wagmi";

/** Rabby first, then other injected browsers; Base Account last (optional). */
export function createWalletConnectors() {
  return [
    injected({ target: "rabby" }),
    injected({ target: "metaMask" }),
    injected(),
    baseAccount({
      appName: "Base OS",
    }),
  ];
}

/** Prefer Rabby / MetaMask over Base Account for the primary Connect button. */
export function pickPreferredConnector(connectors: readonly Connector[]): Connector | undefined {
  if (connectors.length === 0) return undefined;

  const score = (c: Connector): number => {
    const id = c.id.toLowerCase();
    const name = c.name.toLowerCase();
    if (id.includes("rabby") || name.includes("rabby")) return 0;
    if (id.includes("metamask") || name.includes("metamask")) return 1;
    if (c.type === "injected" && !id.includes("baseaccount") && !name.includes("coinbase")) {
      return 2;
    }
    if (id.includes("baseaccount") || name.includes("coinbase") || name.includes("base")) {
      return 10;
    }
    return 5;
  };

  return [...connectors].sort((a, b) => score(a) - score(b))[0];
}

export function connectorButtonLabel(connector: Connector | undefined, isConnecting: boolean): string {
  if (isConnecting) return "Connecting…";
  if (!connector) return "Connect wallet";
  const name = connector.name;
  if (name.toLowerCase().includes("rabby")) return "Connect Rabby";
  if (name.toLowerCase().includes("metamask")) return "Connect MetaMask";
  if (name === "Injected") return "Connect wallet";
  return `Connect ${name}`;
}
