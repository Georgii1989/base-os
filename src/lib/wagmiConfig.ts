import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { base } from "wagmi/chains";
import { Attribution } from "ox/erc8021";
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
  chains: [base],
  connectors: createWalletConnectors(),
  multiInjectedProviderDiscovery: true,
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [base.id]: http(),
  },
  ...(dataSuffix ? { dataSuffix } : {}),
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
