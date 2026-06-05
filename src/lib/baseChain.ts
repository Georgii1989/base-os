import { base, basePreconf } from "wagmi/chains";

/** Base mainnet chain id (8453). */
export const BASE_CHAIN_ID = base.id;

/**
 * Flashblocks-aware Base chain — same id as `base`, preconf RPC for ~200ms tx feedback.
 * @see https://docs.base.org/base-chain/flashblocks/app-integration
 */
export const baseChain = basePreconf;

/** Standard Base RPC (use for server reads that need finalized state). */
export const baseStandard = base;

export const BASE_PRECONF_RPC =
  process.env.NEXT_PUBLIC_BASE_PRECONF_RPC_URL?.trim() ||
  basePreconf.rpcUrls.default.http[0]!;
