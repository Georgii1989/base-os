import type { OsTabId } from "@/lib/osTabs";

export type BriefingItem = {
  id: string;
  icon: string;
  title: string;
  description: string;
  cta: string;
  tab?: OsTabId;
  href?: string;
  priority: number;
  accent: "cyan" | "emerald" | "amber" | "fuchsia" | "violet";
};

export type BriefingInput = {
  isConnected: boolean;
  ethOnBase?: number | null;
  ethOnMainnet?: number | null;
  score?: number | null;
  grade?: string | null;
  scoreDelta?: number | null;
  hasTipBadge?: boolean;
  gasGwei?: number | null;
  radarTopMover?: { name: string; change24h: number } | null;
  tvlChange30dPct?: number | null;
};

export function buildBriefingItems(input: BriefingInput): BriefingItem[] {
  const items: BriefingItem[] = [];

  if (!input.isConnected) {
    items.push({
      id: "connect",
      icon: "◎",
      title: "Connect your wallet",
      description: "Unlock your personal Base briefing — score, balances, and actions.",
      cta: "Connect above",
      priority: 100,
      accent: "cyan",
    });
    return items;
  }

  if (input.ethOnMainnet != null && input.ethOnMainnet >= 0.005) {
    items.push({
      id: "bridge-eth",
      icon: "↗",
      title: `${input.ethOnMainnet.toFixed(4)} ETH on Ethereum`,
      description: "Move to Base via Relay — fast cross-chain route.",
      cta: "Bridge to Base",
      tab: "swap",
      priority: 92,
      accent: "violet",
    });
  }

  if (input.score != null) {
    const delta =
      input.scoreDelta != null && input.scoreDelta !== 0
        ? ` (${input.scoreDelta > 0 ? "+" : ""}${input.scoreDelta} vs last visit)`
        : "";
    items.push({
      id: "score",
      icon: "◇",
      title: `Onchain score ${input.score}${input.grade ? ` · ${input.grade}` : ""}`,
      description: `Your Base activity grade${delta}. Share your identity card.`,
      cta: "View score",
      tab: "score",
      priority: 88,
      accent: "fuchsia",
    });
  }

  if (input.ethOnBase != null) {
    items.push({
      id: "base-balance",
      icon: "⬡",
      title: `${input.ethOnBase.toFixed(4)} ETH on Base`,
      description: "Swap tokens, launch a project, or send a tip on Base.",
      cta: input.ethOnBase >= 0.001 ? "Open swap" : "Explore modules",
      tab: input.ethOnBase >= 0.001 ? "swap" : "home",
      priority: 80,
      accent: "cyan",
    });
  }

  if (input.hasTipBadge === false) {
    items.push({
      id: "tip-badge",
      icon: "✦",
      title: "Mint your supporter badge",
      description: "Send a tip on Base to unlock your soulbound supporter NFT.",
      cta: "Open tips",
      tab: "tip",
      priority: 78,
      accent: "fuchsia",
    });
  }

  if (input.gasGwei != null && input.gasGwei < 0.05) {
    items.push({
      id: "low-gas",
      icon: "⚡",
      title: `Gas ${input.gasGwei.toFixed(3)} gwei — cheap`,
      description: "Good time to deploy a token or batch transactions.",
      cta: "Launch token",
      tab: "launch",
      priority: 70,
      accent: "emerald",
    });
  }

  if (input.radarTopMover && Math.abs(input.radarTopMover.change24h) >= 3) {
    const up = input.radarTopMover.change24h >= 0;
    items.push({
      id: "radar-mover",
      icon: up ? "📈" : "📉",
      title: `${input.radarTopMover.name} ${up ? "+" : ""}${input.radarTopMover.change24h.toFixed(1)}%`,
      description: "Top mover on Base OS Radar in the last 24h.",
      cta: "Open radar",
      tab: "radar",
      priority: 65,
      accent: up ? "emerald" : "amber",
    });
  }

  if (input.tvlChange30dPct != null) {
    items.push({
      id: "network-pulse",
      icon: "◉",
      title: `Base TVL ${input.tvlChange30dPct >= 0 ? "+" : ""}${input.tvlChange30dPct.toFixed(2)}% · 30d`,
      description: "Network pulse from DeFi Llama — explore full analytics.",
      cta: "Analytics",
      tab: "analytics",
      priority: 55,
      accent: input.tvlChange30dPct >= 0 ? "emerald" : "amber",
    });
  }

  items.push({
    id: "guard",
    icon: "⎊",
    title: "Wallet guard",
    description: "Review token approvals and revoke risky access in-app.",
    cta: "Open guard",
    tab: "guard",
    priority: 50,
    accent: "amber",
  });

  return items.sort((a, b) => b.priority - a.priority).slice(0, 6);
}

export function loadScoreSnapshot(address: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`base-os-score:${address.toLowerCase()}`);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function saveScoreSnapshot(address: string, score: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`base-os-score:${address.toLowerCase()}`, String(score));
  } catch {
    /* ignore */
  }
}
