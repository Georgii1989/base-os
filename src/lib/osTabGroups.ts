import { OS_TAB_META, type OsTabId } from "@/lib/osTabs";

export type OsTabGroupId = "hub" | "trade" | "build" | "you" | "explore";

export type OsTabGroup = {
  id: OsTabGroupId;
  label: string;
  tabIds: OsTabId[];
};

/** Primary navigation — lens is command-palette only (?tab=lens). */
export const OS_TAB_GROUPS: OsTabGroup[] = [
  { id: "hub", label: "Hub", tabIds: ["home"] },
  { id: "trade", label: "Trade", tabIds: ["swap"] },
  { id: "build", label: "Build", tabIds: ["launch", "tip"] },
  { id: "you", label: "You", tabIds: ["score", "portfolio", "guard", "watch"] },
  { id: "explore", label: "Explore", tabIds: ["analytics", "radar"] },
];

export const OS_PRIMARY_TAB_IDS: OsTabId[] = OS_TAB_GROUPS.flatMap((g) => g.tabIds);

export function tabMeta(id: OsTabId) {
  return OS_TAB_META.find((t) => t.id === id)!;
}

export function groupForTab(tabId: OsTabId): OsTabGroup | undefined {
  return OS_TAB_GROUPS.find((g) => g.tabIds.includes(tabId));
}
