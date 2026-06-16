import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  addRadarFavorite,
  isRadarFavorite,
  loadRadarFavorites,
  removeRadarFavorite,
  saveRadarFavorites,
  toggleRadarFavorite,
} from "@/lib/radarFavoritesStorage";

function mockLocalStorage() {
  const store = new Map<string, string>();
  const ls = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
  vi.stubGlobal("localStorage", ls);
  vi.stubGlobal("window", {
    localStorage: ls,
    dispatchEvent: vi.fn(),
  });
}

describe("radarFavoritesStorage", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads empty list by default", () => {
    expect(loadRadarFavorites()).toEqual([]);
  });

  it("adds and removes favorites", () => {
    expect(addRadarFavorite("aerodrome")).toBe(true);
    expect(isRadarFavorite("aerodrome")).toBe(true);
    expect(loadRadarFavorites()).toEqual(["aerodrome"]);
    removeRadarFavorite("aerodrome");
    expect(loadRadarFavorites()).toEqual([]);
  });

  it("toggle adds then removes", () => {
    expect(toggleRadarFavorite("moonwell")).toBe(true);
    expect(toggleRadarFavorite("moonwell")).toBe(false);
    expect(loadRadarFavorites()).toEqual([]);
  });

  it("dedupes on save and keeps newest first on add", () => {
    saveRadarFavorites(["a", "b", "a"]);
    expect(loadRadarFavorites()).toEqual(["a", "b"]);
    addRadarFavorite("c");
    addRadarFavorite("a");
    expect(loadRadarFavorites()[0]).toBe("a");
  });

  it("ignores invalid ids", () => {
    saveRadarFavorites(["", "   ", "ok-id"]);
    expect(loadRadarFavorites()).toEqual(["ok-id"]);
    expect(addRadarFavorite("")).toBe(false);
  });
});
