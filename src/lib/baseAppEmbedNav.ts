import type { OsTabGroup } from "@/lib/osTabGroups";
import type { OsTabId } from "@/lib/osTabs";

/** Compact nav for Base App mini-app embed — high-intent modules only. */
export const OS_EMBED_TAB_GROUPS: OsTabGroup[] = [
  { id: "hub", label: "Hub", tabIds: ["home"] },
  { id: "you", label: "You", tabIds: ["score", "portfolio"] },
  { id: "trade", label: "Trade", tabIds: ["swap"] },
  { id: "games", label: "Play", tabIds: ["game", "battleship"] },
  { id: "build", label: "Support", tabIds: ["tip"] },
];

export const OS_EMBED_PRIMARY_TAB_IDS: OsTabId[] = OS_EMBED_TAB_GROUPS.flatMap((g) => g.tabIds);
