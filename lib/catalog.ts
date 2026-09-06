import "server-only";

import { cache } from "react";
import type { Category, Product } from "@/generated/client";
import type { CatalogNavShelf } from "@/lib/catalog-path";
import { categoryPath } from "@/lib/catalog-path";
import { prisma } from "@/lib/prisma";

export { categoryPath, shelfSectionId } from "@/lib/catalog-path";
export { productImageUrl } from "@/lib/product-image";
export type { CatalogNavShelf } from "@/lib/catalog-path";

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
 * Все активные полки с товарами — для боковой навигации.
 * Ссылки ведут на `/category/{shelfSlug}`.
 */
export const getAllNavShelves = cache(
  async (): Promise<Array<CatalogNavShelf & { href: string }>> => {
    const departments = await prisma.category.findMany({
      where: { parentId: null, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: {
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

    return departments.flatMap((department) =>
      department.children.map((shelf) => ({
        slug: shelf.slug,
        name: shelf.name,
        href: categoryPath(shelf.slug),
      })),
    );
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
