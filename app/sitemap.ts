import type { MetadataRoute } from "next";
import { categoryPath, productPath } from "@/lib/catalog-path";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [shelves, products] = await Promise.all([
    prisma.category.findMany({
      where: {
        parentId: { not: null },
        isActive: true,
        products: { some: { isActive: true } },
      },
      select: { slug: true, updatedAt: true },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { id: "asc" },
    }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/contacts"),
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  const categoryEntries: MetadataRoute.Sitemap = shelves.map((shelf) => ({
    url: absoluteUrl(categoryPath(shelf.slug)),
    lastModified: shelf.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(productPath(product)),
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
