import Link from "next/link";
import { ProductCard } from "@/components/ProductCard/ProductCard";
import {
  categoryPath,
  productImageUrl,
  shelfSectionId,
  type ShelfWithProducts,
} from "@/lib/catalog";
import "./CatalogShelfList.css";

type CatalogShelfListProps = {
  shelves: ShelfWithProducts[];
  /** На странице категории заголовок уже в PageHeading — секции без h2. */
  showSectionTitles?: boolean;
  /** Подпись секции товаров на странице категории (h2). */
  productsHeading?: string;
};

/** Полки подряд: заголовок полки → сетка товаров. */
export function CatalogShelfList({
  shelves,
  showSectionTitles = true,
  productsHeading,
}: CatalogShelfListProps) {
  const sections = shelves.filter((shelf) => shelf.products.length > 0);

  return (
    <div className="catalog-shelf-list">
      {productsHeading ? (
        <h2 className="catalog-shelf-list__products-heading">
          {productsHeading}
        </h2>
      ) : null}
      {sections.map((shelf) => (
        <section
          key={shelf.id}
          id={shelfSectionId(shelf.id)}
          className="catalog-shelf-list__section"
        >
          {showSectionTitles ? (
            <h2>
              <Link
                href={categoryPath(shelf.slug)}
                className="catalog-shelf-list__shelf-link"
              >
                {shelf.name}
              </Link>
            </h2>
          ) : null}
          <ul className="catalog-shelf-list__products">
            {shelf.products.map((product) => (
              <li key={product.id}>
                <ProductCard
                  id={product.id}
                  slug={product.slug}
                  name={product.name}
                  price={Number(product.price)}
                  imageSrc={productImageUrl(product)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
