export type FavoriteItem = {
  id: number;
  name: string;
  price: number;
  imageSrc: string;
};

const STORAGE_KEY = "mazurov-favorites";
const FAVORITES_CHANGE_EVENT = "mazurov-favorites-change";

/** Стабильная ссылка для SSR — useSyncExternalStore требует кэш. */
const EMPTY_FAVORITES: FavoriteItem[] = [];

let cachedRaw: string | null = null;
let cachedSnapshot: FavoriteItem[] = EMPTY_FAVORITES;

export function getServerFavoritesSnapshot(): FavoriteItem[] {
  return EMPTY_FAVORITES;
}

function setCachedSnapshot(
  raw: string | null,
  items: FavoriteItem[],
): FavoriteItem[] {
  cachedRaw = raw;
  cachedSnapshot = items.length === 0 ? EMPTY_FAVORITES : items;
  return cachedSnapshot;
}

function notifyFavoritesChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(FAVORITES_CHANGE_EVENT));
}

export function readFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") return EMPTY_FAVORITES;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedSnapshot;
    }

    if (!raw) {
      return setCachedSnapshot(null, EMPTY_FAVORITES);
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return setCachedSnapshot(raw, EMPTY_FAVORITES);
    }

    return setCachedSnapshot(raw, parsed.filter(isFavoriteItem));
  } catch {
    return setCachedSnapshot(null, EMPTY_FAVORITES);
  }
}

export function writeFavorites(items: FavoriteItem[]): void {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(items);
  localStorage.setItem(STORAGE_KEY, raw);
  setCachedSnapshot(raw, items);
  notifyFavoritesChange();
}

/** Подписка на изменения (эта вкладка + другие через storage). */
export function subscribeFavorites(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(FAVORITES_CHANGE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(FAVORITES_CHANGE_EVENT, onChange);
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
