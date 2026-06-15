import { getAddress, isAddress } from "viem";
import type { OsTabId } from "@/lib/osTabs";

/** Query key for score / guard / portfolio address prefill. */
export const OS_ADDRESS_PARAM = "address";

/** Query key for onchain game room invites. */
export const OS_ROOM_PARAM = "room";

/** Tabs that preserve `address` in the URL when navigating. */
export const OS_ADDRESS_DEEP_LINK_TABS = ["score", "portfolio", "guard"] as const;

/** Tabs that support `room` invite deep links. */
export const OS_ROOM_DEEP_LINK_TABS = ["game", "battleship"] as const;

const ADDRESS_TAB_SET = new Set<string>(OS_ADDRESS_DEEP_LINK_TABS);
const ROOM_TAB_SET = new Set<string>(OS_ROOM_DEEP_LINK_TABS);

export function tabSupportsAddressParam(tab: OsTabId): boolean {
  return ADDRESS_TAB_SET.has(tab);
}

export function tabSupportsRoomParam(tab: OsTabId): boolean {
  return ROOM_TAB_SET.has(tab);
}

export function parseRoomSearchParam(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return null;
  try {
    const id = BigInt(trimmed);
    return id > BigInt(0) ? trimmed : null;
  } catch {
    return null;
  }
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

/** Build home URL with tab and optional address / room deep link. */
export function buildOsTabUrl(
  tab: OsTabId,
  options?: { address?: string | null; room?: string | null; origin?: string }
): string {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (options?.address?.trim() && tabSupportsAddressParam(tab)) {
    const parsed = parseAddressSearchParam(options.address);
    if (parsed) params.set(OS_ADDRESS_PARAM, parsed);
  }
  if (options?.room?.trim() && tabSupportsRoomParam(tab)) {
    const room = parseRoomSearchParam(options.room);
    if (room) params.set(OS_ROOM_PARAM, room);
  }
  const path = `/?${params.toString()}`;
  const base = options?.origin?.replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}
