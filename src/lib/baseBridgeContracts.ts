/** Known bridge / gateway contracts on Base (lowercase) — heuristic for bridge-like txs. */
export const BASE_BRIDGE_CONTRACTS = new Set(
  [
    "0x49048044d1675761a8a4cA8Cb25bde69dffb7052", // Optimism Portal (canonical bridge)
    "0x3154cf16dbdb02c1e7f4737a000b45a895c915a6", // Across
    "0x4200000000000000000000000000000000000010", // L2 Standard Bridge
    "0x4200000000000000000000000000000000000015", // L2 ERC721 Bridge
    "0x4200000000000000000000000000000000000016", // L2 ERC1155 Bridge
    "0xc0d3c0d32518ab3380698a03c4509935988508e0", // Relay
    "0x4d9079bb416166aeb987409e19e060f7d6f88676", // Stargate router
    "0x1231deb6f54a186f0ece58b0b7a81d2e343a3c7c", // LiFi diamond
    "0x111111125421ca6dc452d289314280a0f8842a65", // 1inch
    "0xdef1c0ded9bec7f1a1670819833240f027b25eff", // 0x exchange
  ].map((a) => a.toLowerCase())
);

export function isLikelyBridgeTarget(to: string | undefined): boolean {
  const normalized = (to ?? "").trim().toLowerCase();
  if (!normalized.startsWith("0x")) return false;
  return BASE_BRIDGE_CONTRACTS.has(normalized);
}
