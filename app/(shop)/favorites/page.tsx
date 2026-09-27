import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/Breadcrumbs/Breadcrumbs";
import { FavoritesList } from "@/components/FavoritesList/FavoritesList";

export const metadata: Metadata = {
  title: "Избранное — Mazurov Rental",
};

export default function FavoritesPage() {
  return (
    <section className="favorites-page page-split">
      <Breadcrumbs
        items={[
          { label: "главная", href: "/" },
          { label: "избранное" },
        ]}
      />
      <div className="favorites-page__content">
        <FavoritesList />
      </div>
    </section>
  );
}
