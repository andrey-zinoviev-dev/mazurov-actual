export type CartLine = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  imageSrc?: string;
};

const STORAGE_KEY = "mazurov-cart";
const CART_CHANGE_EVENT = "mazurov-cart-change";

/** Стабильная ссылка для SSR и пустой корзины — useSyncExternalStore требует кэш. */
const EMPTY_CART: CartLine[] = [];

let cachedRaw: string | null = null;
let cachedSnapshot: CartLine[] = EMPTY_CART;

export function getServerCartSnapshot(): CartLine[] {
  return EMPTY_CART;
}

function setCachedSnapshot(raw: string | null, lines: CartLine[]): CartLine[] {
  cachedRaw = raw;
  cachedSnapshot = lines.length === 0 ? EMPTY_CART : lines;
  return cachedSnapshot;
}

function notifyCartChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CART_CHANGE_EVENT));
}

export function subscribeCart(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };

  onChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(CART_CHANGE_EVENT, onChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CART_CHANGE_EVENT, onChange);
  };
}

export function readCart(): CartLine[] {
  if (typeof window === "undefined") return EMPTY_CART;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedSnapshot;
    }

    if (!raw) {
      return setCachedSnapshot(null, EMPTY_CART);
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return setCachedSnapshot(raw, EMPTY_CART);
    }

    return setCachedSnapshot(raw, parsed.filter(isCartLine));
  } catch {
    return setCachedSnapshot(null, EMPTY_CART);
  }
}

export function writeCart(lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(lines);
  localStorage.setItem(STORAGE_KEY, raw);
  setCachedSnapshot(raw, lines);
  notifyCartChange();
}

export function updateCartQuantity(id: number, quantity: number): CartLine[] {
  const cart = readCart();
  if (quantity < 1) {
    return removeCartItem(id);
  }

  const next = cart.map((line) =>
    line.id === id ? { ...line, quantity } : line,
  );
  writeCart(next);
  return next;
}

export function removeCartItem(id: number): CartLine[] {
  const next = readCart().filter((line) => line.id !== id);
  writeCart(next);
  return next;
}

export function clearCart(): CartLine[] {
  writeCart([]);
  return [];
}

export type CartItemInput = {
  id: number;
  name: string;
  price: number;
  imageSrc?: string;
};

export function addCartItem(item: CartItemInput): CartLine[] {
  const cart = readCart();
  const existing = cart.find((line) => line.id === item.id);
  if (existing) {
    return updateCartQuantity(item.id, existing.quantity + 1);
  }

  const next = [...cart, { ...item, quantity: 1 }];
  writeCart(next);
  return next;
}

export function toggleCartItem(item: CartItemInput): CartLine[] {
  const cart = readCart();
  if (cart.some((line) => line.id === item.id)) {
    return removeCartItem(item.id);
  }

  const next = [...cart, { ...item, quantity: 1 }];
  writeCart(next);
  return next;
}

export function countCartItems(cart: CartLine[]): number {
  return cart.reduce((sum, line) => sum + line.quantity, 0);
}

function isCartLine(value: unknown): value is CartLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as CartLine;
  return (
    typeof line.id === "number" &&
    typeof line.name === "string" &&
    typeof line.price === "number" &&
    typeof line.quantity === "number" &&
    line.quantity > 0 &&
    (line.imageSrc === undefined || typeof line.imageSrc === "string")
  );
}
