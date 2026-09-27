import "server-only";

import { cache } from "react";
import type { Category, Product } from "@/generated/client";
import type { CatalogNavRoot } from "@/lib/catalog-path";
import { categoryPath } from "@/lib/catalog-path";
import { productImageUrl } from "@/lib/product-image";
import { prisma } from "@/lib/prisma";

export { categoryPath, productPath, shelfSectionId } from "@/lib/catalog-path";
export { productImageUrl } from "@/lib/product-image";
export type { CatalogNavRoot, CatalogNavShelf } from "@/lib/catalog-path";

/** Раздел-корень (`parentId = null`). Пока живёт в данных под учёт; в URL не участвует. */
export type Department = Category;

/** Полка-лист внутри раздела (`parentId = department.id`) */
export type Shelf = Category;

/** Полка с товарами — секция каталога на главной / страница категории */
export type ShelfWithProducts = Shelf & {
  products: Product[];
};

const shelfWithProductsInclude = {
  products: {
    where: { isActive: true },
    orderBy: [{ itemOrder: "asc" as const }, { name: "asc" as const }],
  },
};

/**
 * Все активные полки каталога с товарами — для главной.
 * Порядок: разделы по `sortOrder`, внутри — полки по `sortOrder` / имени.
 */
export const getAllShelvesWithProducts = cache(
  async (): Promise<ShelfWithProducts[]> => {
    const departments = await prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: {
        children: {
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          include: shelfWithProductsInclude,
        },
      },
    });

    return departments.flatMap((department) => department.children);
  },
);

/**
 * Активные разделы с полками — для аккордеона боковой навигации.
 * Root в URL не участвует; ссылки полок — `/category/{shelfSlug}`.
 */
export type CatalogNavRootWithHrefs = {
  slug: string;
  name: string;
  shelves: Array<CatalogNavRoot["shelves"][number] & { href: string }>;
};

export const getAllNavRoots = cache(
  async (): Promise<CatalogNavRootWithHrefs[]> => {
    const departments = await prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: {
        slug: true,
        name: true,
        children: {
          where: {
            isActive: true,
            products: { some: { isActive: true } },
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { slug: true, name: true },
        },
      },
    });

    return departments
      .filter((department) => department.children.length > 0)
      .map((department) => ({
        slug: department.slug,
        name: department.name,
        shelves: department.children.map((shelf) => ({
          slug: shelf.slug,
          name: shelf.name,
          href: categoryPath(shelf.slug),
        })),
      }));
  },
);

/** Активные полки для `generateStaticParams` */
export const getShelfSlugs = cache(async (): Promise<string[]> => {
  const shelves = await prisma.category.findMany({
    where: {
      parentId: { not: null },
      isActive: true,
      products: { some: { isActive: true } },
    },
    select: { slug: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return shelves.map((shelf) => shelf.slug);
});

/**
 * Одна полка по slug из URL (`parentId != null`).
 * Если slug не уникален среди полок — бросает ошибку (нужна правка данных).
 */
export const getShelfBySlug = cache(
  async (slug: string): Promise<ShelfWithProducts | undefined> => {
    const rows = await prisma.category.findMany({
      where: {
        slug,
        parentId: { not: null },
        isActive: true,
      },
      include: shelfWithProductsInclude,
    });

    if (rows.length > 1) {
      throw new Error(
        `Duplicate shelf slug "${slug}" (${rows.length} rows). Shelf slugs must be unique for /category/[slug].`,
      );
    }

    return rows[0];
  },
);

/** Активный товар по id из URL `/product/[id]`. */
export const getProductById = cache(async (id: number) => {
  if (!Number.isInteger(id) || id <= 0) {
    return undefined;
  }

  return prisma.product.findFirst({
    where: { id, isActive: true },
    include: {
      category: {
        select: { id: true, slug: true, name: true, parentId: true },
      },
    },
  });
});

/** Лёгкий хит для header-поиска / combobox */
export type ProductSearchHit = {
  id: number;
  name: string;
  price: number;
  imageSrc: string;
};

const SEARCH_MIN_QUERY = 2;
const SEARCH_DEFAULT_LIMIT = 10;

/**
 * Поиск активных товаров по подстроке в имени.
 * Для header combobox — быстро найти и положить в корзину.
 */
export async function searchProducts(
  query: string,
  limit = SEARCH_DEFAULT_LIMIT,
): Promise<ProductSearchHit[]> {
  const q = query.trim();
  if (q.length < SEARCH_MIN_QUERY) {
    return [];
  }

  const take = Math.min(Math.max(limit, 1), 20);
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      name: { contains: q },
    },
    orderBy: [{ name: "asc" }],
    take,
    select: { id: true, name: true, price: true, image: true },
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    price: Number(product.price),
    imageSrc: productImageUrl(product),
  }));
}
