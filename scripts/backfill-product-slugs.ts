/**
 * Заполняет `products.slug` из `name` для строк, где slug ещё NULL/пустой.
 *
 * Запуск (из корня репо, с валидным DATABASE_URL в .env):
 *   npm run backfill:product-slugs
 *
 * Идемпотентно: повторный запуск трогает только пустые slug.
 * Свой PrismaClient — без `lib/prisma` (`server-only`).
 */
import "dotenv/config";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/client";
import {
  allocateUniqueSlug,
  slugifyProductName,
} from "../lib/product-slug";

function poolConfigFromDatabaseUrl(url: string) {
  const parsed = new URL(url);
  const host = parsed.hostname === "localhost" ? "127.0.0.1" : parsed.hostname;

  return {
    host,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    connectionLimit: 5,
    connectTimeout: 10_000,
    acquireTimeout: 20_000,
    allowPublicKeyRetrieval: true,
    prepareCacheLength: 0,
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(poolConfigFromDatabaseUrl(url)),
  });

  try {
    // Один запрос: в Prisma 7 для String? фильтр `{ not: null }` недопустим.
    const all = await prisma.product.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { id: "asc" },
    });

    const taken = new Set(
      all
        .map((row) => row.slug?.trim())
        .filter((slug): slug is string => Boolean(slug)),
    );

    const products = all.filter((row) => !row.slug?.trim());

    if (products.length === 0) {
      console.log("Nothing to do: all products already have a slug.");
      return;
    }

    let updated = 0;
    for (const product of products) {
      const base =
        slugifyProductName(product.name) || `product-${product.id}`;
      const slug = allocateUniqueSlug(base, taken);

      await prisma.product.update({
        where: { id: product.id },
        data: { slug },
      });

      taken.add(slug);
      updated += 1;
      console.log(`${product.id}\t${slug}`);
    }

    console.log(`Done. Filled slug for ${updated} product(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
