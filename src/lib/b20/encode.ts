import {
  encodeAbiParameters,
  encodeFunctionData,
  parseAbiParameters,
  type Hex,
} from "viem";
import { B20_TOKEN_ABI } from "@/lib/b20/abi";
import {
  B20_ASSET_CREATE_PARAMS_VERSION,
  B20_MINT_ROLE,
} from "@/lib/b20/constants";

export function encodeAssetCreateParams(
  name: string,
  symbol: string,
  initialAdmin: `0x${string}`,
  decimals: number
): Hex {
  return encodeAbiParameters(
    parseAbiParameters("uint8 version, string name, string symbol, address initialAdmin, uint8 decimals"),
    [B20_ASSET_CREATE_PARAMS_VERSION, name, symbol, initialAdmin, decimals]
  );
}

export function encodeGrantRole(role: Hex, account: `0x${string}`): Hex {
  return encodeFunctionData({
    abi: B20_TOKEN_ABI,
    functionName: "grantRole",
    args: [role, account],
  });
}

export function encodeUpdateSupplyCap(cap: bigint): Hex {
  return encodeFunctionData({
    abi: B20_TOKEN_ABI,
    functionName: "updateSupplyCap",
    args: [cap],
  });
}

export function encodeBatchMint(recipients: `0x${string}`[], amounts: bigint[]): Hex {
  return encodeFunctionData({
    abi: B20_TOKEN_ABI,
    functionName: "batchMint",
    args: [recipients, amounts],
  });
}

export function buildAssetInitCalls(input: {
  admin: `0x${string}`;
  supplyCap: bigint;
  mintTo: `0x${string}`;
  mintAmount: bigint;
}): Hex[] {
  const calls: Hex[] = [
    encodeGrantRole(B20_MINT_ROLE, input.admin),
    encodeUpdateSupplyCap(input.supplyCap),
  ];
  if (input.mintAmount > BigInt(0)) {
    calls.push(encodeBatchMint([input.mintTo], [input.mintAmount]));
  }
  return calls;
}

export function randomB20Salt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let hex = "0x";
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex as `0x${string}`;
}
