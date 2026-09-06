/** Ссылка на страницу полки */
export function categoryPath(shelfSlug: string): string {
  return `/category/${shelfSlug}`;
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
