"use client";

import Image from "next/image";
import { useMemo, useSyncExternalStore } from "react";
import { useFavorites } from "@/components/FavoritesProvider";
import {
  getServerCartSnapshot,
  readCart,
  subscribeCart,
  toggleCartItem,
} from "@/lib/cart";
import "./ProductCard.css";

export type ProductCardProps = {
  id: number;
  name: string;
  /** Цена аренды за день (руб.) */
  price: number;
  imageSrc: string;
};

function formatPricePerDay(price: number): string {
  return `${price.toLocaleString("ru-RU")} ₽/день`;
}

export function ProductCard({ id, name, price, imageSrc }: ProductCardProps) {
  const { isFavorite, toggle } = useFavorites();
  const favorited = isFavorite(id);

  const cart = useSyncExternalStore(subscribeCart, readCart, getServerCartSnapshot);
  const inCart = useMemo(
    () => cart.some((line) => line.id === id),
    [cart, id],
  );

  return (
    <article className="product-card">
      <header className="product-card__header">
        <h3 className="product-card__title">{name}</h3>
        <button
          type="button"
          className={`product-card__icon-btn${favorited ? " product-card__icon-btn--active" : ""}`}
          aria-label={
            favorited ? "Убрать из избранного" : "Добавить в избранное"
          }
          aria-pressed={favorited}
          onClick={() => toggle({ id, name, price, imageSrc })}
        >
          <HeartIcon filled={favorited} />
        </button>
      </header>

      <div className="product-card__media">
        <Image
          src={imageSrc}
          alt={name}
          fill
          sizes="(max-width: 640px) 100vw, 320px"
          className="product-card__image"
        />
      </div>

      <footer className="product-card__footer">
        <p className="product-card__price">{formatPricePerDay(price)}</p>
        <button
          type="button"
          className={`product-card__icon-btn${inCart ? " product-card__icon-btn--active" : ""}`}
          aria-label={inCart ? "Убрать из корзины" : "Добавить в корзину"}
          aria-pressed={inCart}
          onClick={() => toggleCartItem({ id, name, price, imageSrc })}
        >
          {inCart ? <CheckIcon /> : <PlusIcon />}
        </button>
      </footer>
    </article>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="product-card__icon"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 20.25s-7.2-4.35-7.2-9.15A3.9 3.9 0 0 1 12 7.65a3.9 3.9 0 0 1 7.2 3.45c0 4.8-7.2 9.15-7.2 9.15Z"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="product-card__icon"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M12 5v14M5 12h14"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="product-card__icon"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.5 12.5 10 17l8.5-9"
      />
    </svg>
  );
}
