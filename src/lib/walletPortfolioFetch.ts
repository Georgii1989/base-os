import { formatUnits, getAddress, isAddress } from "viem";

const BLOCKSCOUT_BASE = "https://base.blockscout.com/api/v2";

export type PortfolioToken = {
  address: `0x${string}`;
  name: string;
  symbol: string;
  decimals: number;
  balanceRaw: string;
  balanceFormatted: string;
  priceUsd: number | null;
  valueUsd: number | null;
  iconUrl: string | null;
};

export type WalletPortfolioPayload = {
  address: `0x${string}`;
  ethBalanceWei: string;
  ethBalanceFormatted: string;
  ethPriceUsd: number | null;
  ethValueUsd: number | null;
  tokens: PortfolioToken[];
  tokenCount: number;
  hasMore: boolean;
  source: "blockscout";
};

type BlockscoutTokenItem = {
  value?: string;
  token?: {
    address_hash?: string;
    name?: string | null;
    symbol?: string | null;
    decimals?: string | null;
    exchange_rate?: string | null;
    icon_url?: string | null;
    reputation?: string | null;
  };
};

type BlockscoutTokensPage = {
  items?: BlockscoutTokenItem[];
  next_page_params?: { id?: number; value?: string; items_count?: number } | null;
};

type BlockscoutAddress = {
  coin_balance?: string;
  exchange_rate?: string | null;
};

function getBlockscoutHeaders(): HeadersInit {
  const key = process.env.BLOCKSCOUT_API_KEY?.trim();
  return key ? { accept: "application/json", "x-api-key": key } : { accept: "application/json" };
}

/** Hide obvious airdrop / phishing ERC-20 dust in portfolio UI. */
export function isLikelySpamToken(name: string, symbol: string): boolean {
  const hay = `${name} ${symbol}`.toLowerCase();
  const spamPatterns = [
    "claim:",
    "claim ",
    "www.",
    "http",
    "eligible",
    "airdrop",
    "visit ",
    ".cfd",
    ".xyz",
    "verify:",
    "reward",
  ];
  return spamPatterns.some((p) => hay.includes(p));
}

function parseUsdRate(raw: string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatPortfolioAmount(raw: string, decimals: number): string {
  try {
    const formatted = formatUnits(BigInt(raw), decimals);
    const n = Number(formatted);
    if (!Number.isFinite(n)) return formatted;
    if (n === 0) return "0";
    if (n < 0.0001) return "<0.0001";
    if (n < 1) return n.toFixed(6).replace(/\.?0+$/, "");
    if (n < 1000) return n.toFixed(4).replace(/\.?0+$/, "");
    return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  } catch {
    return "0";
  }
}

function parseTokenItem(item: BlockscoutTokenItem): PortfolioToken | null {
  const token = item.token;
  const raw = item.value;
  if (!token?.address_hash || !raw || !isAddress(token.address_hash)) return null;

  const name = (token.name ?? token.symbol ?? "Unknown").trim() || "Unknown";
  const symbol = (token.symbol ?? "???").trim() || "???";
  if (isLikelySpamToken(name, symbol)) return null;

  const decimalsRaw = token.decimals ?? "18";
  const decimals = Number(decimalsRaw);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) return null;

  let balanceRaw: bigint;
  try {
    balanceRaw = BigInt(raw);
  } catch {
    return null;
  }
  if (balanceRaw <= BigInt(0)) return null;

  const priceUsd = parseUsdRate(token.exchange_rate);
  const balanceFormatted = formatPortfolioAmount(raw, decimals);
  let valueUsd: number | null = null;
  if (priceUsd != null) {
    const amount = Number(formatUnits(balanceRaw, decimals));
    if (Number.isFinite(amount)) valueUsd = amount * priceUsd;
  }

  return {
    address: getAddress(token.address_hash),
    name,
    symbol,
    decimals,
    balanceRaw: raw,
    balanceFormatted,
    priceUsd,
    valueUsd,
    iconUrl: token.icon_url ?? null,
  };
}

export function sortPortfolioTokens(tokens: PortfolioToken[]): PortfolioToken[] {
  return [...tokens].sort((a, b) => {
    const av = a.valueUsd ?? -1;
    const bv = b.valueUsd ?? -1;
    if (av !== bv) return bv - av;
    try {
      const ab = BigInt(a.balanceRaw);
      const bb = BigInt(b.balanceRaw);
      if (ab > bb) return -1;
      if (ab < bb) return 1;
    } catch {
      /* ignore */
    }
    return a.symbol.localeCompare(b.symbol);
  });
}

export async function fetchWalletPortfolio(
  address: `0x${string}`,
  options?: { hideSpam?: boolean }
): Promise<WalletPortfolioPayload> {
  const hideSpam = options?.hideSpam !== false;
  const headers = getBlockscoutHeaders();

  const [addrRes, tokensRes] = await Promise.all([
    fetch(`${BLOCKSCOUT_BASE}/addresses/${address}`, {
      headers,
      next: { revalidate: 60 },
    }),
    fetch(`${BLOCKSCOUT_BASE}/addresses/${address}/tokens?type=ERC-20`, {
      headers,
      next: { revalidate: 60 },
    }),
  ]);

  if (!addrRes.ok) {
    throw new Error(`blockscout_address_${addrRes.status}`);
  }
  if (!tokensRes.ok) {
    throw new Error(`blockscout_tokens_${tokensRes.status}`);
  }

  const addrJson = (await addrRes.json()) as BlockscoutAddress;
  const tokensJson = (await tokensRes.json()) as BlockscoutTokensPage;

  const ethBalanceWei = addrJson.coin_balance ?? "0";
  const ethPriceUsd = parseUsdRate(addrJson.exchange_rate);
  let ethValueUsd: number | null = null;
  try {
    const ethAmount = Number(formatUnits(BigInt(ethBalanceWei), 18));
    if (ethPriceUsd != null && Number.isFinite(ethAmount)) {
      ethValueUsd = ethAmount * ethPriceUsd;
    }
  } catch {
    /* ignore */
  }

  const parsed: PortfolioToken[] = [];
  for (const item of tokensJson.items ?? []) {
    const row = parseTokenItem(item);
    if (!row) continue;
    if (hideSpam && isLikelySpamToken(row.name, row.symbol)) continue;
    parsed.push(row);
  }

  const tokens = sortPortfolioTokens(parsed);

  return {
    address,
    ethBalanceWei,
    ethBalanceFormatted: formatPortfolioAmount(ethBalanceWei, 18),
    ethPriceUsd,
    ethValueUsd,
    tokens,
    tokenCount: tokens.length,
    hasMore: Boolean(tokensJson.next_page_params),
    source: "blockscout",
  };
}
