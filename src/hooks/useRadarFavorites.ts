"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BASE_OS_RADAR_FAVORITES_EVENT,
  addRadarFavorite,
  isRadarFavorite,
  loadRadarFavorites,
  removeRadarFavorite,
  toggleRadarFavorite,
} from "@/lib/radarFavoritesStorage";

export function useRadarFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    setFavoriteIds(loadRadarFavorites());
    setHydrated(true);
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(BASE_OS_RADAR_FAVORITES_EVENT, onChange);
    return () => window.removeEventListener(BASE_OS_RADAR_FAVORITES_EVENT, onChange);
  }, [refresh]);

  const favoriteSet = new Set(favoriteIds);

  return {
    favoriteIds,
    favoriteSet,
    hydrated,
    isFavorite: (id: string) => favoriteSet.has(id),
    toggle: toggleRadarFavorite,
    add: addRadarFavorite,
    remove: removeRadarFavorite,
    isStoredFavorite: isRadarFavorite,
  };
}
