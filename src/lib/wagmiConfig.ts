import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { arbitrum, basePreconf, baseSepolia, bsc, linea, mainnet, zkSync } from "wagmi/chains";
import { Attribution } from "ox/erc8021";
import { BASE_PRECONF_RPC } from "@/lib/baseChain";
import { BASE_SEPOLIA_RPC } from "@/lib/baseSepolia";
import { createWalletConnectors } from "@/lib/walletConnectors";

const DEFAULT_BUILDER_CODE = "bc_59omft8w";
const builderCode =
  process.env.NEXT_PUBLIC_BASE_BUILDER_CODE?.trim() || DEFAULT_BUILDER_CODE;
const dataSuffix = builderCode
  ? Attribution.toDataSuffix({
      codes: [builderCode],
    })
  : undefined;

export const wagmiConfig = createConfig({
  chains: [basePreconf, baseSepolia, mainnet, arbitrum, bsc, linea, zkSync],
  connectors: createWalletConnectors(),
  /** Avoid auto-adding Coinbase / other EIP-6963 wallets that hijack connect. */
  multiInjectedProviderDiscovery: false,
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [basePreconf.id]: http(BASE_PRECONF_RPC),
    [baseSepolia.id]: http(BASE_SEPOLIA_RPC),
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [bsc.id]: http(),
    [linea.id]: http(),
    [zkSync.id]: http(),
  },
  ...(dataSuffix ? { dataSuffix } : {}),
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
