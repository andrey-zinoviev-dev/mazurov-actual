/**
 * Заполняет `products.description` из CSV «Название товара» + «SEO-описание».
 *
 * Сопоставление — по точному `name` (после trim). По умолчанию не перезаписывает
 * уже заполненные описания; для перезаписи: `--force`.
 *
 * Источник данных (по приоритету):
 *   1. `--file path/to.csv`
 *   2. env `SEO_DESCRIPTIONS_CSV` (локальный путь)
 *   3. env `SEO_DESCRIPTIONS_SHEET_URL` (export URL Google Sheets)
 *   4. дефолтный export URL таблицы SEO-описаний
 *
 * Запуск (из корня репо, с валидным DATABASE_URL в .env):
 *   npm run backfill:product-descriptions -- --dry-run
 *   npm run backfill:product-descriptions
 *   npm run backfill:product-descriptions -- --file scripts/data/seo-product-descriptions.csv
 *   npm run backfill:product-descriptions -- --force
 *
 * Свой PrismaClient — без `lib/prisma` (`server-only`).
 */
import "dotenv/config";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/client";

const DEFAULT_SHEET_EXPORT_URL =
  "https://docs.google.com/spreadsheets/d/1gtQfA2k8YRR91SK-PxNZ_QT1Rrg24XaP1vYHxDPkXw8/export?format=csv";

type CsvRow = { name: string; description: string };
type ProductRow = { id: number; name: string; description: string | null };

/** Схлопывает NBSP/пробелы и приводит к сопоставимому ключу. */
function normalizeName(name: string): string {
  return name
    .normalize("NFKC")
    .replace(/[\u00A0\u202F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

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

function parseArgs(argv: string[]) {
  let dryRun = false;
  let force = false;
  let file: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }
    if (arg === "--file") {
      file = argv[i + 1];
      if (!file) {
        throw new Error("--file requires a path");
      }
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { dryRun, force, file };
}

/** Минимальный RFC4180-парсер для двухколоночного CSV. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    // Игнор полностью пустых строк (часто в конце файла).
    if (row.length === 1 && row[0] === "") {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      pushField();
      continue;
    }
    if (ch === "\n") {
      pushField();
      pushRow();
      continue;
    }
    if (ch === "\r") {
      continue;
    }
    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  return rows;
}

function rowsFromCsv(text: string): CsvRow[] {
  const table = parseCsv(text.replace(/^\uFEFF/, ""));
  if (table.length === 0) {
    throw new Error("CSV is empty");
  }

  const header = table[0].map((cell) => cell.trim().toLowerCase());
  const nameIdx = header.findIndex(
    (h) => h === "название товара" || h === "name" || h === "title",
  );
  const descIdx = header.findIndex(
    (h) =>
      h === "seo-описание" ||
      h === "seo описание" ||
      h === "описание" ||
      h === "description",
  );

  if (nameIdx < 0 || descIdx < 0) {
    throw new Error(
      `CSV header must include name + description columns, got: ${table[0].join(" | ")}`,
    );
  }

  const out: CsvRow[] = [];
  for (let i = 1; i < table.length; i += 1) {
    const cells = table[i];
    const name = (cells[nameIdx] ?? "").trim();
    const description = (cells[descIdx] ?? "").trim();
    if (!name && !description) continue;
    if (!name || !description) {
      console.warn(`Skip incomplete row ${i + 1}: name="${name}"`);
      continue;
    }
    out.push({ name, description });
  }
  return out;
}

async function loadCsvText(opts: {
  file?: string;
}): Promise<{ source: string; text: string }> {
  if (opts.file) {
    const path = resolve(opts.file);
    return { source: path, text: await readFile(path, "utf8") };
  }

  const envFile = process.env.SEO_DESCRIPTIONS_CSV?.trim();
  if (envFile) {
    const path = resolve(envFile);
    return { source: path, text: await readFile(path, "utf8") };
  }

  const url =
    process.env.SEO_DESCRIPTIONS_SHEET_URL?.trim() || DEFAULT_SHEET_EXPORT_URL;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to download sheet CSV (${res.status} ${res.statusText}). ` +
        `Make the spreadsheet public «Anyone with the link» or pass --file.`,
    );
  }
  return { source: url, text: await res.text() };
}

async function main() {
  const { dryRun, force, file } = parseArgs(process.argv.slice(2));

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const { source, text } = await loadCsvText({ file });
  const csvRows = rowsFromCsv(text);
  console.log(`Source: ${source}`);
  console.log(`CSV rows with name+description: ${csvRows.length}`);
  if (dryRun) console.log("Mode: dry-run (no writes)");
  if (force) console.log("Mode: force (overwrite non-empty descriptions)");

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(poolConfigFromDatabaseUrl(url)),
  });

  try {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { id: "asc" },
    });

    const byExact = new Map<string, ProductRow[]>();
    const byNorm = new Map<string, ProductRow[]>();
    for (const product of products) {
      const exactKey = product.name.trim();
      const exactList = byExact.get(exactKey) ?? [];
      exactList.push(product);
      byExact.set(exactKey, exactList);

      const normKey = normalizeName(product.name);
      const normList = byNorm.get(normKey) ?? [];
      normList.push(product);
      byNorm.set(normKey, normList);
    }

    let updated = 0;
    let skippedExisting = 0;
    let skippedSame = 0;
    let notFound = 0;
    let ambiguous = 0;
    let softMatched = 0;

    const notFoundNames: string[] = [];
    const ambiguousNames: string[] = [];

    for (const row of csvRows) {
      let matches = byExact.get(row.name) ?? [];
      let viaSoft = false;

      if (matches.length === 0) {
        matches = byNorm.get(normalizeName(row.name)) ?? [];
        viaSoft = matches.length > 0;
      }

      if (matches.length === 0) {
        notFound += 1;
        notFoundNames.push(row.name);
        continue;
      }

      if (matches.length > 1) {
        ambiguous += 1;
        ambiguousNames.push(
          `${row.name} (ids: ${matches.map((m) => m.id).join(", ")})`,
        );
        continue;
      }

      const product = matches[0];
      if (viaSoft) softMatched += 1;
      const current = product.description?.trim() ?? "";

      if (current && !force) {
        skippedExisting += 1;
        continue;
      }

      if (current === row.description) {
        skippedSame += 1;
        continue;
      }

      if (!dryRun) {
        await prisma.product.update({
          where: { id: product.id },
          data: { description: row.description },
        });
      }

      updated += 1;
      console.log(`${dryRun ? "WOULD " : ""}UPDATE ${product.id}\t${product.name}`);
    }

    console.log("---");
    console.log(`Updated:           ${updated}${dryRun ? " (dry-run)" : ""}`);
    console.log(`  of which soft:   ${softMatched} (normalize whitespace/unicode)`);
    console.log(`Skipped (filled):  ${skippedExisting}`);
    console.log(`Skipped (same):    ${skippedSame}`);
    console.log(`Not found in DB:   ${notFound}`);
    console.log(`Ambiguous names:   ${ambiguous}`);

    if (notFoundNames.length > 0) {
      console.log("\nNot found:");
      for (const name of notFoundNames) console.log(`  - ${name}`);
    }
    if (ambiguousNames.length > 0) {
      console.log("\nAmbiguous (skipped):");
      for (const name of ambiguousNames) console.log(`  - ${name}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
