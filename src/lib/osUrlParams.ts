import { getAddress, isAddress } from "viem";
import type { OsTabId } from "@/lib/osTabs";

/** Query key for score / guard / portfolio address prefill. */
export const OS_ADDRESS_PARAM = "address";

/** Tabs that preserve `address` in the URL when navigating. */
export const OS_ADDRESS_DEEP_LINK_TABS = ["score", "portfolio", "guard"] as const;

const ADDRESS_TAB_SET = new Set<string>(OS_ADDRESS_DEEP_LINK_TABS);

export function tabSupportsAddressParam(tab: OsTabId): boolean {
  return ADDRESS_TAB_SET.has(tab);
}

/**
 * Normalize an `address` search param for deep links.
 * Returns checksummed 0x address or null if invalid.
 */
export function parseAddressSearchParam(raw: string | null | undefined): `0x${string}` | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (!isAddress(trimmed)) return null;
  try {
    return getAddress(trimmed);
  } catch {
    return null;
  }
}

/** Build home URL with tab and optional address deep link. */
export function buildOsTabUrl(
  tab: OsTabId,
  options?: { address?: string | null; origin?: string }
): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (options?.address?.trim() && tabSupportsAddressParam(tab)) {
    const parsed = parseAddressSearchParam(options.address);
    if (parsed) params.set(OS_ADDRESS_PARAM, parsed);
  }
  const path = `/?${params.toString()}`;
  const base = options?.origin?.replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}
