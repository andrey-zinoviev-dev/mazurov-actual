"use client";

import { ProductCard } from "@/components/ProductCard/ProductCard";
import { useFavorites } from "@/components/FavoritesProvider";
import "./FavoritesList.css";

export function FavoritesList() {
  const { items } = useFavorites();

  if (items.length === 0) {
    return (
      <p className="favorites-page__empty">
        Пока пусто. Нажмите на сердечко у товара в каталоге.
      </p>
    );
  }

  return (
    <ul className="favorites-page__products">
      {items.map((item) => (
        <li key={item.id}>
          <ProductCard
            id={item.id}
            name={item.name}
            price={item.price}
            imageSrc={item.imageSrc}
          />
        </li>
      ))}
    </ul>
  );
}
