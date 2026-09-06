import type { Metadata } from "next";
import { FavoritesList } from "@/components/FavoritesList/FavoritesList";

export const metadata: Metadata = {
  title: "Избранное — Mazurov Rental",
};

export default function FavoritesPage() {
  return (
    <section className="favorites-page page-split">
      <h1>избранное</h1>
      <div className="favorites-page__content">
        <FavoritesList />
      </div>
    </section>
  );
}
