import { baseAccount, injected } from "wagmi/connectors";
import type { Connector } from "wagmi";
import { isBaseAppEmbed } from "@/lib/isBaseAppEmbed";

/**
 * Web: Rabby / MetaMask. Base App mini-app: Base Account (embedded wallet).
 */
export function createWalletConnectors() {
  return [
    injected({ target: "rabby" }),
    injected({ target: "metaMask" }),
    baseAccount({
      appName: "Base OS",
    }),
  ];
}

export function isCoinbaseLikeConnector(connector: Connector): boolean {
  const id = connector.id.toLowerCase();
  const name = connector.name.toLowerCase();
  return (
    id.includes("coinbase") ||
    id.includes("baseaccount") ||
    id.includes("com.coinbase") ||
    name.includes("coinbase") ||
    name.includes("base account") ||
    name.includes("smart wallet")
  );
}

/** Base App → Base Account; normal browser → Rabby / MetaMask (never Coinbase popup). */
export function pickPreferredConnector(connectors: readonly Connector[]): Connector | undefined {
  if (connectors.length === 0) return undefined;

  if (isBaseAppEmbed()) {
    return (
      connectors.find((c) => c.id === "baseAccount" || c.type === "baseAccount") ??
      connectors[0]
    );
  }

  const eligible = connectors.filter((c) => !isCoinbaseLikeConnector(c));
  if (eligible.length === 0) return undefined;

  const rabby = eligible.find((c) => {
    const id = c.id.toLowerCase();
    const name = c.name.toLowerCase();
    return id.includes("rabby") || name.includes("rabby");
  });
  if (rabby) return rabby;

  const metaMask = eligible.find((c) => {
    const id = c.id.toLowerCase();
    const name = c.name.toLowerCase();
    return id.includes("metamask") || name.includes("metamask");
  });
  if (metaMask) return metaMask;

  return eligible[0];
}

export function connectorButtonLabel(connector: Connector | undefined, isConnecting: boolean): string {
  if (isConnecting) return "Connecting…";
  if (!connector) return isBaseAppEmbed() ? "Connect" : "Install Rabby";
  return "Connect";
}
