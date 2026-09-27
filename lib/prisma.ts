import "server-only";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Parse DATABASE_URL into mariadb pool settings (avoids localhost/IPv6 hangs on Windows). */
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
    // MySQL 8 + caching_sha2_password over TCP can hang the pool without this.
    allowPublicKeyRetrieval: true,
    prepareCacheLength: 0,
  };
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  return new PrismaClient({
    adapter: new PrismaMariaDb(poolConfigFromDatabaseUrl(url)),
  });
}

/**
 * В dev `globalThis.prisma` переживает HMR. После `prisma generate`
 * (новые модели Order и т.п.) старый инстанс остаётся без делегатов →
 * `prisma.order` === undefined → `.create` падает.
 */
function getClient(): PrismaClient {
  const cached = globalForPrisma.prisma;
  if (
    cached &&
    typeof cached.order?.create === "function" &&
    typeof cached.customer?.upsert === "function" &&
    typeof cached.otpChallenge?.create === "function" &&
    typeof cached.customerSession?.create === "function" &&
    typeof cached.promoCode?.findUnique === "function"
  ) {
    return cached;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = getClient();
