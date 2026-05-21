import { injected } from "wagmi/connectors";
import type { Connector } from "wagmi";

/** Rabby + MetaMask only — no Base Account / Coinbase Smart Wallet popup. */
export function createWalletConnectors() {
  return [injected({ target: "rabby" }), injected({ target: "metaMask" })];
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

/** Only Rabby or MetaMask — never Coinbase / Base Account. */
export function pickPreferredConnector(connectors: readonly Connector[]): Connector | undefined {
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
  if (!connector) return "Install Rabby";
  return "Connect";
}
