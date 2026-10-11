/** Ссылка на страницу полки */
export function categoryPath(shelfSlug: string): string {
  return `/category/${shelfSlug}`;
}

export type ProductPathInput = {
  id: number;
  /** SEO-slug; если нет — временный URL `/product/{id}` */
  slug?: string | null;
};

/** Ссылка на страницу товара: `/product/{slug}-{id}` или `/product/{id}`. */
export function productPath(product: ProductPathInput): string {
  const slug = product.slug?.trim();
  if (slug) {
    return `/product/${slug}-${product.id}`;
  }
  return `/product/${product.id}`;
}

/**
 * Разбор сегмента URL `/product/[slug]`.
 * — `sony-fx6-100004` → `{ slug: "sony-fx6", id: 100004 }`
 * — `100004` → `{ slug: null, id: 100004 }` (старый формат)
 */
export function parseProductParam(
  raw: string,
): { id: number; slug: string | null } | null {
  const value = raw.trim();
  if (!value) return null;

  if (/^\d+$/.test(value)) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? { id, slug: null } : null;
  }

  const match = value.match(/^(.+)-(\d+)$/);
  if (!match) return null;

  const slug = match[1];
  const id = Number(match[2]);
  if (!slug || !Number.isInteger(id) || id <= 0) return null;

  return { id, slug };
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
