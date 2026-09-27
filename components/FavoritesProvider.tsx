"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  getServerFavoritesSnapshot,
  readFavorites,
  subscribeFavorites,
  toggleFavorite,
  writeFavorites,
  type FavoriteItem,
} from "@/lib/favorites";

type FavoritesContextValue = {
  items: FavoriteItem[];
  isFavorite: (id: number) => boolean;
  toggle: (item: FavoriteItem) => void;
};

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(
    subscribeFavorites,
    readFavorites,
    getServerFavoritesSnapshot,
  );

  const toggle = useCallback((item: FavoriteItem) => {
    writeFavorites(toggleFavorite(readFavorites(), item));
  }, []);

  const isFavorite = useCallback(
    (id: number) => items.some((entry) => entry.id === id),
    [items],
  );

  const value = useMemo(
    () => ({ items, isFavorite, toggle }),
    [items, isFavorite, toggle],
  );

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return context;
}
