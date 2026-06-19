export type OsTabId =
  | "home"
  | "tip"
  | "launch"
  | "swap"
  | "game"
  | "battleship"
  | "drop"
  | "analytics"
  | "radar"
  | "guard"
  | "score"
  | "portfolio"
  | "watch"
  | "lens";

export type OsTabMeta = {
  id: OsTabId;
  label: string;
  eyebrow: string;
  /** Hidden from primary nav — reachable via ⌘K or ?tab= */
  hidden?: boolean;
};

export const OS_TAB_META: readonly OsTabMeta[] = [
  { id: "home", label: "Home", eyebrow: "Briefing" },
  { id: "swap", label: "Swap & Bridge", eyebrow: "Trade" },
  { id: "game", label: "Grid 6×6", eyebrow: "1v1 onchain" },
  { id: "battleship", label: "Battleship", eyebrow: "10×10 naval" },
  { id: "launch", label: "Launch", eyebrow: "Token" },
  { id: "tip", label: "Tips", eyebrow: "Support" },
  { id: "drop", label: "Base Verify", eyebrow: "Anti-sybil" },
  { id: "score", label: "Score", eyebrow: "Identity" },
  { id: "portfolio", label: "Portfolio", eyebrow: "Balances" },
  { id: "guard", label: "Guard", eyebrow: "Revoke" },
  { id: "watch", label: "Tracked", eyebrow: "Wallets" },
  { id: "analytics", label: "Analytics", eyebrow: "Base TVL" },
  { id: "radar", label: "Radar", eyebrow: "Apps" },
  { id: "lens", label: "Simulate tx", eyebrow: "Advanced", hidden: true },
] as const;

const TAB_SET = new Set<OsTabId>(OS_TAB_META.map((tab) => tab.id));

export const OS_VISIBLE_TABS = OS_TAB_META.filter((t) => !t.hidden);

export function isOsTabId(value: string | null | undefined): value is OsTabId {
  return typeof value === "string" && TAB_SET.has(value as OsTabId);
}

/** Default Home — personal briefing surface. */
export function tabFromSearchParam(tab: string | null | undefined): OsTabId {
  if (tab === "wallet") return "score";
  return isOsTabId(tab) ? tab : "home";
}
