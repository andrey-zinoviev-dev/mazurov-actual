/** Публичный origin сайта (без хвостового `/`). */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Общие данные бизнеса для контактов, OG и JSON-LD */
export const SITE = {
  name: "Mazurov Rental",
  locale: "ru_RU",
  defaultTitle: "Mazurov Rental — аренда кинооборудования в Москве",
  defaultDescription:
    "Аренда кинооборудования в Москве: камеры, свет и звук. Суточная аренда, самовывоз.",
  /** Fallback OG / логотип в public/ */
  defaultOgImagePath: "/logo.png",
  phoneE164: "+79773016613",
  phoneLabel: "+7 977 301-66-13",
  pickupAddress: "Москва, ул. Павла Андреева, 23с10",
  pickupCoords: { lon: 37.6216427, lat: 55.7206617 },
  city: "Москва",
  country: "RU",
} as const;
