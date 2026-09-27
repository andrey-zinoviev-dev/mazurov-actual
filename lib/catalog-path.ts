/** Ссылка на страницу полки */
export function categoryPath(shelfSlug: string): string {
  return `/category/${shelfSlug}`;
}

/** Ссылка на страницу товара */
export function productPath(productId: number): string {
  return `/product/${productId}`;
}

/** id секции полки на главной */
export function shelfSectionId(shelfId: number): string {
  return `shelf-${shelfId}`;
}

/** Полка в боковой навигации (без товаров) */
export type CatalogNavShelf = {
  slug: string;
  name: string;
};

/** Раздел-корень с полками — для аккордеона в CatalogNav */
export type CatalogNavRoot = {
  slug: string;
  name: string;
  shelves: CatalogNavShelf[];
};
