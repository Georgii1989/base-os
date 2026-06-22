import { keccak256, toBytes } from "viem";

/** Singleton B20 Factory precompile (same on Base Sepolia and mainnet). */
export const B20_FACTORY_ADDRESS =
  "0xb20f000000000000000000000000000000000000" as const;

export const B20_VARIANT_ASSET = 0;

export const B20_ASSET_CREATE_PARAMS_VERSION = 1;

export const B20_MIN_DECIMALS = 6;
export const B20_MAX_DECIMALS = 18;

/** `keccak256("MINT_ROLE")` */
export const B20_MINT_ROLE = keccak256(toBytes("MINT_ROLE"));

/** `type(uint128).max` — unbounded supply cap sentinel. */
export const B20_MAX_SUPPLY_CAP = BigInt("340282366920938463463374607431768211455");
