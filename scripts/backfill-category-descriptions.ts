/**
 * Заполняет `categories.description` у полок (`parentId != null`)
 * из CSV «Раздел» + «Категория» + «SEO-описание».
 *
 * Сопоставление:
 *   1. точное `category.name` + `parent.name` (Раздел)
 *   2. если раздела нет / не совпал — по уникальному `category.name` среди полок
 *   3. soft-match через normalize (пробелы/unicode)
 *
 * По умолчанию не перезаписывает уже заполненные описания; для перезаписи: `--force`.
 *
 * Источник данных (по приоритету):
 *   1. `--file path/to.csv`
 *   2. env `SEO_CATEGORY_DESCRIPTIONS_CSV` (локальный путь)
 *   3. env `SEO_CATEGORY_DESCRIPTIONS_SHEET_URL` (export URL Google Sheets)
 *   4. дефолтный export URL таблицы SEO-описаний категорий
 *
 * Запуск (из корня репо, с валидным DATABASE_URL в .env):
 *   npm run backfill:category-descriptions -- --dry-run
 *   npm run backfill:category-descriptions
 *   npm run backfill:category-descriptions -- --file scripts/data/seo-category-descriptions.csv
 *   npm run backfill:category-descriptions -- --force
 *
 * Свой PrismaClient — без `lib/prisma` (`server-only`).
 */
import "dotenv/config";

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/client";

const DEFAULT_SHEET_EXPORT_URL =
  "https://docs.google.com/spreadsheets/d/1UiA2sCOQaGSkfdE6QbDzfhhO98-3L5-NTlZyS_cvQb0/export?format=csv";

type CsvRow = {
  department: string;
  name: string;
  description: string;
};

type ShelfRow = {
  id: number;
  name: string;
  description: string | null;
  parentName: string | null;
};

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

/** Минимальный RFC4180-парсер CSV. */
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
  const deptIdx = header.findIndex(
    (h) =>
      h === "раздел" ||
      h === "department" ||
      h === "parent" ||
      h === "родитель",
  );
  const nameIdx = header.findIndex(
    (h) =>
      h === "категория" ||
      h === "category" ||
      h === "shelf" ||
      h === "name" ||
      h === "название",
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
      `CSV header must include category + description columns, got: ${table[0].join(" | ")}`,
    );
  }

  const out: CsvRow[] = [];
  for (let i = 1; i < table.length; i += 1) {
    const cells = table[i];
    const department = (deptIdx >= 0 ? (cells[deptIdx] ?? "") : "").trim();
    const name = (cells[nameIdx] ?? "").trim();
    const description = (cells[descIdx] ?? "").trim();
    if (!name && !description) continue;
    if (!name || !description) {
      console.warn(`Skip incomplete row ${i + 1}: category="${name}"`);
      continue;
    }
    out.push({ department, name, description });
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

  const envFile = process.env.SEO_CATEGORY_DESCRIPTIONS_CSV?.trim();
  if (envFile) {
    const path = resolve(envFile);
    return { source: path, text: await readFile(path, "utf8") };
  }

  const url =
    process.env.SEO_CATEGORY_DESCRIPTIONS_SHEET_URL?.trim() ||
    DEFAULT_SHEET_EXPORT_URL;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to download sheet CSV (${res.status} ${res.statusText}). ` +
        `Make the spreadsheet public «Anyone with the link» or pass --file.`,
    );
  }
  return { source: url, text: await res.text() };
}

function pairKey(department: string, name: string): string {
  return `${normalizeName(department)}||${normalizeName(name)}`;
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
  console.log(`CSV rows with category+description: ${csvRows.length}`);
  if (dryRun) console.log("Mode: dry-run (no writes)");
  if (force) console.log("Mode: force (overwrite non-empty descriptions)");

  const prisma = new PrismaClient({
    adapter: new PrismaMariaDb(poolConfigFromDatabaseUrl(url)),
  });

  try {
    const shelves = await prisma.category.findMany({
      where: { parentId: { not: null } },
      select: {
        id: true,
        name: true,
        description: true,
        parent: { select: { name: true } },
      },
      orderBy: { id: "asc" },
    });

    const shelfRows: ShelfRow[] = shelves.map((shelf) => ({
      id: shelf.id,
      name: shelf.name,
      description: shelf.description,
      parentName: shelf.parent?.name ?? null,
    }));

    const byPair = new Map<string, ShelfRow[]>();
    const byExactName = new Map<string, ShelfRow[]>();
    const byNormName = new Map<string, ShelfRow[]>();

    for (const shelf of shelfRows) {
      if (shelf.parentName) {
        const key = pairKey(shelf.parentName, shelf.name);
        const list = byPair.get(key) ?? [];
        list.push(shelf);
        byPair.set(key, list);
      }

      const exactKey = shelf.name.trim();
      const exactList = byExactName.get(exactKey) ?? [];
      exactList.push(shelf);
      byExactName.set(exactKey, exactList);

      const normKey = normalizeName(shelf.name);
      const normList = byNormName.get(normKey) ?? [];
      normList.push(shelf);
      byNormName.set(normKey, normList);
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
      let matches: ShelfRow[] = [];
      let viaSoft = false;

      if (row.department) {
        matches = byPair.get(pairKey(row.department, row.name)) ?? [];
      }

      if (matches.length === 0) {
        matches = byExactName.get(row.name.trim()) ?? [];
      }

      if (matches.length === 0) {
        matches = byNormName.get(normalizeName(row.name)) ?? [];
        viaSoft = matches.length > 0;
      }

      const label = row.department
        ? `${row.department} / ${row.name}`
        : row.name;

      if (matches.length === 0) {
        notFound += 1;
        notFoundNames.push(label);
        continue;
      }

      if (matches.length > 1) {
        ambiguous += 1;
        ambiguousNames.push(
          `${label} (ids: ${matches.map((m) => m.id).join(", ")})`,
        );
        continue;
      }

      const shelf = matches[0];
      if (viaSoft) softMatched += 1;
      const current = shelf.description?.trim() ?? "";

      if (current && !force) {
        skippedExisting += 1;
        continue;
      }

      if (current === row.description) {
        skippedSame += 1;
        continue;
      }

      if (!dryRun) {
        await prisma.category.update({
          where: { id: shelf.id },
          data: { description: row.description },
        });
      }

      updated += 1;
      console.log(
        `${dryRun ? "WOULD " : ""}UPDATE ${shelf.id}\t${shelf.parentName ?? "—"}\t${shelf.name}`,
      );
    }

    console.log("---");
    console.log(`Updated:           ${updated}${dryRun ? " (dry-run)" : ""}`);
    console.log(
      `  of which soft:   ${softMatched} (normalize whitespace/unicode)`,
    );
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
