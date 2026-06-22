import { baseSepolia } from "wagmi/chains";

/** Base Sepolia — B20 precompiles (chain 84532). */
export const BASE_SEPOLIA_CHAIN_ID = baseSepolia.id;

export const BASE_SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL?.trim() ||
  baseSepolia.rpcUrls.default.http[0]!;

export const baseSepoliaChain = baseSepolia;

export function sepoliaExplorerAddress(address: string): string {
  return `https://sepolia.basescan.org/address/${address}`;
}

export function sepoliaExplorerTx(hash: string): string {
  return `https://sepolia.basescan.org/tx/${hash}`;
}

export function sepoliaExplorerToken(address: string): string {
  return `https://sepolia.basescan.org/token/${address}`;
}
