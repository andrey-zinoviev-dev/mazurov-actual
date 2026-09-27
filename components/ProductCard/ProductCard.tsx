"use client";

import Image from "next/image";
import Link from "next/link";
import { ProductAddToCart } from "@/components/ProductAddToCart/ProductAddToCart";
import { useFavorites } from "@/components/FavoritesProvider";
import { productPath } from "@/lib/catalog-path";
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

  return (
    <article className="product-card">
      {/* Растянутая ссылка на всю карточку; кнопки выше по z-index. */}
      <Link
        href={productPath(id)}
        className="product-card__link"
        aria-label={name}
      />

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
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 320px"
          className="product-card__image"
        />
      </div>

      <footer className="product-card__footer">
        <p className="product-card__price">{formatPricePerDay(price)}</p>
        <ProductAddToCart
          id={id}
          name={name}
          price={price}
          imageSrc={imageSrc}
          variant="compact"
          className="product-card__cart"
        />
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
