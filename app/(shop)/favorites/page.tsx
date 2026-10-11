import type { Metadata } from "next";
// import { Breadcrumbs } from "@/components/Breadcrumbs/Breadcrumbs";
import { FavoritesList } from "@/components/FavoritesList/FavoritesList";
import { PageHeading } from "@/components/PageHeading/PageHeading";

export const metadata: Metadata = {
  title: "Избранное",
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  return (
    <section className="favorites-page page-split">
      {/* <Breadcrumbs
        items={[
          { label: "главная", href: "/" },
          { label: "избранное" },
        ]}
      /> */}
      <PageHeading title="Избранное" lead="Сохранённые позиции из каталога" />
      <div className="favorites-page__content">
        <FavoritesList />
      </div>
    </section>
  );
}
