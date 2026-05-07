import { getAddress, isAddress } from "viem";

export const BASE_OS_WATCHLIST_EVENT = "base-os-watchlist-change";

const STORAGE_KEY = "base-os-watchlist:v1";
export const watchlistCapacity = 48;

function normalizeEntry(raw: string): `0x${string}` | null {
  const t = raw.trim();
  if (!isAddress(t)) return null;
  return getAddress(t);
}

/** Safe on server — returns []. */
export function loadWatchlist(): `0x${string}`[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: `0x${string}`[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (typeof item !== "string") continue;
      const addr = normalizeEntry(item);
      if (!addr || seen.has(addr)) continue;
      seen.add(addr);
      out.push(addr);
      if (out.length >= watchlistCapacity) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function saveWatchlist(addresses: `0x${string}`[]): void {
  if (typeof window === "undefined") return;
  const unique: `0x${string}`[] = [];
  const seen = new Set<string>();
  for (const a of addresses) {
    const n = normalizeEntry(a);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    unique.push(n);
    if (unique.length >= watchlistCapacity) break;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
  window.dispatchEvent(new Event(BASE_OS_WATCHLIST_EVENT));
}

export function isWatched(addr: string): boolean {
  const n = normalizeEntry(addr);
  if (!n) return false;
  return loadWatchlist().includes(n);
}

export function addToWatchlist(addr: string): boolean {
  const n = normalizeEntry(addr);
  if (!n) return false;
  const cur = loadWatchlist();
  if (cur.includes(n)) return false;
  if (cur.length >= watchlistCapacity) return false;
  saveWatchlist([...cur, n]);
  return true;
}

export function removeFromWatchlist(addr: string): void {
  const n = normalizeEntry(addr);
  if (!n) return;
  saveWatchlist(loadWatchlist().filter((a) => a !== n));
}

export function toggleWatchlistAddress(addr: string): boolean {
  const n = normalizeEntry(addr);
  if (!n) return false;
  if (isWatched(n)) {
    removeFromWatchlist(n);
    return false;
  }
  return addToWatchlist(n);
}
