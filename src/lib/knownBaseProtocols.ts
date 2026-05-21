import { BASE_BRIDGE_CONTRACTS } from "@/lib/baseBridgeContracts";
import { radarProjects } from "@/lib/radarProjects";

const BRIDGE_LABELS: Record<string, string> = {
  "0x49048044d1675761a8a4cA8Cb25bde69dffb7052": "Optimism Portal",
  "0x3154cf16dbdb02c1e7f4737a000b45a895c915a6": "Across",
  "0x4200000000000000000000000000000000000010": "Base Bridge",
  "0x4200000000000000000000000000000000000015": "Base NFT Bridge",
  "0x4200000000000000000000000000000000000016": "ERC-1155 Bridge",
  "0xc0d3c0d32518ab3380698a03c4509935988508e0": "Relay",
  "0x4d9079bb416166aeb987409e19e060f7d6f88676": "Stargate",
  "0x1231deb6f54a186f0ece58b0b7a81d2e343a3c7c": "LiFi",
  "0x111111125421ca6dc452d289314280a0f8842a65": "1inch",
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff": "0x Exchange",
};

/** Curated routers / tokens on Base (lowercase address → display name). */
const CURATED: Record<string, string> = {
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": "USDC",
  "0x4200000000000000000000000000000000000006": "WETH",
  "0x940181a94a35a4569e4529a3cdfb74e38fd98631": "Aerodrome",
  "0x2626664c2603336e57b271c5c0b26f421741e481": "Uniswap Router",
  "0x3fc91a3afd703466cdfeb54d677ba48ba83ac383": "Uniswap Universal",
  "0xcf77a3ba9a5ca0eb00dd647ef43fe903c035758": "CowSwap",
  "0x0000000000001ff3684f28c67538d4d072c22734": "Aerodrome Router",
  "0xa88594d404727625a9437c3f886c7643872296ae": "Moonwell",
  "0x4ed4e862860bed51a9570b96d89af5e1b0efefed": "Degen",
  "0x532f27101965dd16442e59d40670faf5ebb142e4": "Brett",
  "0x0b3e328455c4059eeb9f3f84b5543f74e24e7e1b": "Virtuals",
};

function extractAddressFromBaseScanUrl(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/basescan\.org\/address\/(0x[a-fA-F0-9]{40})/i);
  return m?.[1]?.toLowerCase() ?? null;
}

function buildKnownProtocolMap(): Map<string, string> {
  const map = new Map<string, string>();

  for (const [addr, label] of Object.entries(CURATED)) {
    map.set(addr.toLowerCase(), label);
  }
  for (const [addr, label] of Object.entries(BRIDGE_LABELS)) {
    map.set(addr.toLowerCase(), label);
  }
  for (const addr of BASE_BRIDGE_CONTRACTS) {
    if (!map.has(addr)) map.set(addr, "Bridge");
  }
  for (const p of radarProjects) {
    if (p.tokenAddress) {
      map.set(p.tokenAddress.toLowerCase(), p.name);
    }
    const fromUrl = extractAddressFromBaseScanUrl(p.baseScanUrl);
    if (fromUrl && !map.has(fromUrl)) map.set(fromUrl, p.name);
  }

  return map;
}

const KNOWN = buildKnownProtocolMap();

export function resolveProtocolLabel(address: string): string {
  const key = address.trim().toLowerCase();
  return KNOWN.get(key) ?? "";
}

export function shortenAddressDisplay(address: string): string {
  const t = address.trim();
  if (t.length <= 13) return t;
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}
