"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  addCartItem,
  getServerCartSnapshot,
  readCart,
  subscribeCart,
  updateCartQuantity,
  type CartItemInput,
} from "@/lib/cart";
import "./ProductAddToCart.css";

type ProductAddToCartProps = CartItemInput & {
  className?: string;
  /** `compact` — для плотных мест вроде карточки каталога */
  variant?: "default" | "compact";
};

export function ProductAddToCart({
  id,
  name,
  price,
  imageSrc,
  className,
  variant = "default",
}: ProductAddToCartProps) {
  const cart = useSyncExternalStore(
    subscribeCart,
    readCart,
    getServerCartSnapshot,
  );
  const quantity = useMemo(
    () => cart.find((line) => line.id === id)?.quantity ?? 0,
    [cart, id],
  );

  const rootClass = [
    "product-add-to-cart",
    variant === "compact" ? "product-add-to-cart--compact" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  function handleAdd() {
    addCartItem({ id, name, price, imageSrc });
  }

  function handleDecrement() {
    if (quantity < 1) return;
    updateCartQuantity(id, quantity - 1);
  }

  if (quantity < 1) {
    return (
      <div className={rootClass}>
        <button
          type="button"
          className="product-add-to-cart__cta"
          onClick={handleAdd}
        >
          добавить в корзину
        </button>
      </div>
    );
  }

  return (
    <div className={rootClass} aria-label="Количество в корзине">
      <button
        type="button"
        className="product-add-to-cart__btn"
        aria-label="Уменьшить количество"
        onClick={handleDecrement}
      >
        −
      </button>
      <span className="product-add-to-cart__count" aria-live="polite">
        {quantity}
      </span>
      <button
        type="button"
        className="product-add-to-cart__btn"
        aria-label="Увеличить количество"
        onClick={handleAdd}
      >
        +
      </button>
    </div>
  );
}
