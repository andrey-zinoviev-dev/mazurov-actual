import { ProductCard } from "@/components/ProductCard/ProductCard";
import {
  productImageUrl,
  shelfSectionId,
  type ShelfWithProducts,
} from "@/lib/catalog";
import "./CatalogShelfList.css";

type CatalogShelfListProps = {
  shelves: ShelfWithProducts[];
  title: string;
};

/** Полки подряд: заголовок полки → сетка товаров. */
export function CatalogShelfList({ shelves, title }: CatalogShelfListProps) {
  const sections = shelves.filter((shelf) => shelf.products.length > 0);

  return (
    <div className="catalog-shelf-list">
      {sections.map((shelf) => (
        <section
          key={shelf.id}
          id={shelfSectionId(shelf.id)}
          className="catalog-shelf-list__section"
        >
          <h2>{shelf.name}</h2>
          <ul className="catalog-shelf-list__products">
            {shelf.products.map((product) => (
              <li key={product.id}>
                <ProductCard
                  id={product.id}
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
