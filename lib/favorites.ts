export type FavoriteItem = {
  id: number;
  name: string;
  price: number;
  imageSrc: string;
};

const STORAGE_KEY = "mazurov-favorites";

export function readFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isFavoriteItem);
  } catch {
    return [];
  }
}

export function writeFavorites(items: FavoriteItem[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Подписка на изменения (первая вкладка + другие вкладки через storage). */
export function subscribeFavorites(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };

  onChange();
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener("storage", onStorage);
  };
}

export function toggleFavorite(
  items: FavoriteItem[],
  item: FavoriteItem,
): FavoriteItem[] {
  const exists = items.some((entry) => entry.id === item.id);
  if (exists) {
    return items.filter((entry) => entry.id !== item.id);
  }
  return [...items, item];
}

function isFavoriteItem(value: unknown): value is FavoriteItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as FavoriteItem;
  return (
    typeof item.id === "number" &&
    typeof item.name === "string" &&
    typeof item.price === "number" &&
    typeof item.imageSrc === "string"
  );
}
