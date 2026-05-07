import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

/** Read-only RPC for server components — no secrets. Uses Base public endpoints from viem. */
export function getBasePublicClient() {
  return createPublicClient({
    chain: base,
    transport: http(),
  });
}
