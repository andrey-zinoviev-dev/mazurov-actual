/** Транслит кириллицы → латиница для SEO-slug товара. */
const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

/** Макс. длина колонки `products.slug` (VarChar 191). */
export const PRODUCT_SLUG_MAX_LENGTH = 191;

/**
 * Имя товара → SEO-slug (`sony-fx6`, `kamera-sony`).
 * Не включает id — он дописывается в URL: `/product/{slug}-{id}`.
 */
export function slugifyProductName(name: string): string {
  const lower = name.trim().toLowerCase();
  let out = "";

  for (const ch of lower) {
    if (ch in CYRILLIC_TO_LATIN) {
      out += CYRILLIC_TO_LATIN[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      out += ch;
    } else {
      out += "-";
    }
  }

  return out
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, PRODUCT_SLUG_MAX_LENGTH);
}

/** Уникальный slug: при коллизии добавляет `-2`, `-3`, … */
export function allocateUniqueSlug(
  base: string,
  taken: Set<string>,
): string {
  const fallback = "product";
  const root = (base || fallback).slice(0, PRODUCT_SLUG_MAX_LENGTH);

  if (!taken.has(root)) return root;

  let n = 2;
  while (true) {
    const suffix = `-${n}`;
    const candidate = `${root.slice(0, PRODUCT_SLUG_MAX_LENGTH - suffix.length)}${suffix}`;
    if (!taken.has(candidate)) return candidate;
    n += 1;
  }
}
