"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
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
  const [items, setItems] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    return subscribeFavorites(() => {
      setItems(readFavorites());
    });
  }, []);

  const toggle = useCallback((item: FavoriteItem) => {
    setItems((current) => {
      const next = toggleFavorite(current, item);
      writeFavorites(next);
      return next;
    });
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
