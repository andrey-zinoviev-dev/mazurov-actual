import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CatalogNav } from "@/components/CatalogNav/CatalogNav";
import { getAllNavShelves, getShelfBySlug } from "@/lib/catalog";
import "@/components/CatalogNav/CatalogNav.css";

type CategorySlugLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function CategorySlugLayout({
  children,
  params,
}: CategorySlugLayoutProps) {
  const { slug } = await params;
  const shelf = await getShelfBySlug(slug);
  if (!shelf) {
    notFound();
  }

  const navShelves = await getAllNavShelves();

  return (
    <div className="catalog-layout">
      <Suspense
        fallback={
          <div className="catalog-nav">
            <span className="catalog-nav__trigger" aria-hidden="true">
              [ категории ▼ ]
            </span>
          </div>
        }
      >
        <CatalogNav title="Каталог" allHref="/" shelves={navShelves} />
      </Suspense>
      <div className="catalog-layout__content">{children}</div>
    </div>
  );
}
