import type { OsTabGroup } from "@/lib/osTabGroups";
import { OS_TAB_GROUPS } from "@/lib/osTabGroups";
import type { OsTabId } from "@/lib/osTabs";

export const REFLECT_PRIMARY_NAV: OsTabId[] = ["home", "swap", "score", "radar"];

export function reflectNavTabIds(groups: readonly OsTabGroup[] = OS_TAB_GROUPS): OsTabId[] {
  const seen = new Set<OsTabId>();
  const ids: OsTabId[] = [];
  for (const id of REFLECT_PRIMARY_NAV) {
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  for (const group of groups) {
    for (const id of group.tabIds) {
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  }
  return ids;
}

export type ReflectModule = {
  tab: OsTabId;
  title: string;
  description: string;
  icon: "score" | "chart" | "radar" | "wallet" | "swap" | "launch" | "game" | "shield";
};

export const REFLECT_FEATURE_MODULES: ReflectModule[] = [
  {
    tab: "score",
    title: "Onchain score",
    description: "Paste any address — txs, contracts, bridges, grade.",
    icon: "score",
  },
  {
    tab: "analytics",
    title: "Base analytics",
    description: "TVL, fees, stables, DEX — live charts.",
    icon: "chart",
  },
  {
    tab: "radar",
    title: "Project radar",
    description: "Curated Base apps with prices and favorites.",
    icon: "radar",
  },
  {
    tab: "portfolio",
    title: "Portfolio",
    description: "ETH + ERC-20 on Base — valued via Blockscout.",
    icon: "wallet",
  },
  {
    tab: "swap",
    title: "Swap & bridge",
    description: "Swap on Base via 0x, bridge with Relay.",
    icon: "swap",
  },
  {
    tab: "launch",
    title: "Launch token",
    description: "Deploy your ERC-20 on Base — you pay gas.",
    icon: "launch",
  },
  {
    tab: "b20",
    title: "B20 launch",
    description: "Native Base B20 token on Sepolia — one transaction.",
    icon: "launch",
  },
  {
    tab: "game",
    title: "Grid 6×6",
    description: "1v1 four-in-a-row onchain — stake ETH.",
    icon: "game",
  },
  {
    tab: "guard",
    title: "Wallet guard",
    description: "Review and revoke token approvals.",
    icon: "shield",
  },
];

export const TAB_HERO_SUBTITLES: Partial<Record<OsTabId, string>> = {
  home: "Briefing, trade, build, and protect — one interface for everything on Base.",
  swap: "Swap on Base via 0x, or bridge ETH/USDC with Relay and official routes.",
  score: "Paste any address — transactions, contracts, bridges, and a letter grade.",
  radar: "Curated Base apps with live prices — star your favorites.",
  game: "1v1 four-in-a-row onchain — create a room or join with ETH.",
  battleship: "10×10 naval combat on Base — place ships and fire onchain.",
  tip: "Send tips and mint a supporter badge on Base.",
  launch: "Deploy your ERC-20 token on Base in one flow.",
  b20: "Launch a native B20 token on Base Sepolia — create, then mint in two wallet steps.",
  drop: "Prove a social account via Base Verify — one identity, one claim.",
  analytics: "TVL, fees, stables, and DEX volume on Base.",
  portfolio: "ETH and ERC-20 balances on Base via Blockscout.",
  guard: "Review allowances and revoke risky approvals.",
  watch: "Pin addresses — balance and activity in-browser.",
  lens: "Simulate a transaction before you send it.",
};
