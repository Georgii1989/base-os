export const BASE_OS_RADAR_FAVORITES_EVENT = "base-os-radar-favorites-change";

const STORAGE_KEY = "base-os-radar-favorites:v1";
export const radarFavoritesCapacity = 32;

function normalizeId(raw: string): string | null {
  const id = raw.trim();
  if (!id || id.length > 64) return null;
  return id;
}

/** Safe on server — returns []. */
export function loadRadarFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of parsed) {
      if (typeof item !== "string") continue;
      const id = normalizeId(item);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
      if (out.length >= radarFavoritesCapacity) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function saveRadarFavorites(ids: string[]): void {
  if (typeof window === "undefined") return;
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = normalizeId(raw);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    unique.push(id);
    if (unique.length >= radarFavoritesCapacity) break;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unique));
  window.dispatchEvent(new Event(BASE_OS_RADAR_FAVORITES_EVENT));
}

export function isRadarFavorite(id: string): boolean {
  const n = normalizeId(id);
  if (!n) return false;
  return loadRadarFavorites().includes(n);
}

export function addRadarFavorite(id: string): boolean {
  const n = normalizeId(id);
  if (!n) return false;
  const cur = loadRadarFavorites();
  if (cur.includes(n)) {
    saveRadarFavorites([n, ...cur.filter((item) => item !== n)]);
    return true;
  }
  if (cur.length >= radarFavoritesCapacity) return false;
  saveRadarFavorites([n, ...cur]);
  return true;
}

export function removeRadarFavorite(id: string): void {
  const n = normalizeId(id);
  if (!n) return;
  saveRadarFavorites(loadRadarFavorites().filter((item) => item !== n));
}

export function toggleRadarFavorite(id: string): boolean {
  const n = normalizeId(id);
  if (!n) return false;
  if (isRadarFavorite(n)) {
    removeRadarFavorite(n);
    return false;
  }
  return addRadarFavorite(n);
}
