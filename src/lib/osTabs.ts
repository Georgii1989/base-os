export type OsTabId = "home" | "tip" | "radar" | "guard" | "wallet" | "watch" | "lens";

export const OS_TAB_META: readonly { id: OsTabId; label: string; eyebrow: string }[] = [
  { id: "home", label: "Home", eyebrow: "Start here" },
  { id: "tip", label: "Tip", eyebrow: "Give tips" },
  { id: "radar", label: "Radar", eyebrow: "Explore" },
  { id: "watch", label: "Tracked", eyebrow: "Addresses" },
  { id: "lens", label: "Txn preview", eyebrow: "Test only" },
  { id: "guard", label: "Guard", eyebrow: "Token access" },
  { id: "wallet", label: "Wallet", eyebrow: "Your account" },
] as const;

const TAB_SET = new Set<OsTabId>(OS_TAB_META.map((tab) => tab.id));

export function isOsTabId(value: string | null | undefined): value is OsTabId {
  return typeof value === "string" && TAB_SET.has(value as OsTabId);
}

/** Default Tip — primary daily surface. */
export function tabFromSearchParam(tab: string | null | undefined): OsTabId {
  return isOsTabId(tab) ? tab : "tip";
}
