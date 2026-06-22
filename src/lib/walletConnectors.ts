import { baseAccount, injected } from "wagmi/connectors";
import type { Connector } from "wagmi";
import { isBaseAppEmbed } from "@/lib/isBaseAppEmbed";

/**
 * Web: Rabby / MetaMask / any injected EIP-1193 wallet.
 * Base App mini-app: Base Account (embedded wallet).
 */
export function createWalletConnectors() {
  return [
    injected({ target: "rabby" }),
    injected({ target: "metaMask" }),
    injected({ shimDisconnect: true }),
    baseAccount({
      appName: "Base OS",
    }),
  ];
}

type EthereumProvider = {
  isRabby?: boolean;
  isMetaMask?: boolean;
  request?: (...args: unknown[]) => Promise<unknown>;
};

function browserEthereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { ethereum?: EthereumProvider }).ethereum;
}

/** Skip connectors whose wallet extension is not actually present in the browser. */
export function isConnectorProviderAvailable(connector: Connector): boolean {
  const eth = browserEthereum();
  if (!eth?.request) return false;

  const id = connector.id.toLowerCase();
  const name = connector.name.toLowerCase();

  if (id.includes("rabby") || name.includes("rabby")) {
    return eth.isRabby === true;
  }
  if (id.includes("metamask") || name.includes("metamask")) {
    return eth.isMetaMask === true;
  }
  if (connector.type === "baseAccount" || id.includes("baseaccount")) {
    return isBaseAppEmbed();
  }

  return true;
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

/** Base App → Base Account; normal browser → Rabby / MetaMask / generic injected. */
export function pickPreferredConnector(connectors: readonly Connector[]): Connector | undefined {
  if (connectors.length === 0) return undefined;

  if (isBaseAppEmbed()) {
    return (
      connectors.find(
        (c) =>
          (c.id === "baseAccount" || c.type === "baseAccount") &&
          isConnectorProviderAvailable(c)
      ) ?? connectors.find((c) => isConnectorProviderAvailable(c))
    );
  }

  const eligible = connectors.filter(
    (c) => !isCoinbaseLikeConnector(c) && isConnectorProviderAvailable(c)
  );
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

  const generic = eligible.find((c) => c.id === "injected" || c.type === "injected");
  if (generic) return generic;

  return eligible[0];
}

export function connectorButtonLabel(connector: Connector | undefined, isConnecting: boolean): string {
  if (isConnecting) return "Connecting…";
  if (!connector) {
    if (isBaseAppEmbed()) return "Connect";
    const eth = browserEthereum();
    if (!eth?.request) return "Install a wallet";
    return "No compatible wallet";
  }
  return "Connect";
}

export function formatConnectError(error: Error | null): string | null {
  if (!error) return null;
  if ("shortMessage" in error && typeof error.shortMessage === "string") {
    return error.shortMessage;
  }
  return error.message;
}
