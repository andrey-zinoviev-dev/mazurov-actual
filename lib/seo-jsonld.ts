import { categoryPath, productPath } from "@/lib/catalog-path";
import { absoluteUrl, SITE } from "@/lib/site";

type BreadcrumbItem = {
  name: string;
  path?: string;
};

export function localBusinessJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${absoluteUrl("/")}/#business`,
    name: SITE.name,
    description: SITE.defaultDescription,
    url: absoluteUrl("/"),
    image: absoluteUrl(SITE.logoPath),
    telephone: SITE.phoneE164,
    priceRange: SITE.priceRange,
    address: {
      "@type": "PostalAddress",
      streetAddress: "ул. Павла Андреева, 23с10",
      addressLocality: SITE.city,
      addressCountry: SITE.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE.pickupCoords.lat,
      longitude: SITE.pickupCoords.lon,
    },
    areaServed: {
      "@type": "City",
      name: SITE.city,
    },
    ...(SITE.sameAs.length > 0 ? { sameAs: [...SITE.sameAs] } : {}),
  };
}

export function breadcrumbListJsonLd(
  items: BreadcrumbItem[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}

export function productJsonLd(product: {
  id: number;
  slug?: string | null;
  name: string;
  price: number;
  stock: number;
  imageUrl: string;
  categoryName: string;
  description?: string | null;
}): Record<string, unknown> {
  const path = productPath(product);
  const url = absoluteUrl(path);
  const availability =
    product.stock > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  const description =
    product.description?.trim() ||
    `Аренда ${product.name} — ${product.price.toLocaleString("ru-RU")} ₽/день. ${product.categoryName}, самовывоз в Москве.`;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
    sku: String(product.id),
    productID: String(product.id),
    image: [product.imageUrl],
    description,
    category: product.categoryName,
    brand: {
      "@type": "Brand",
      name: SITE.name,
    },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "RUB",
      price: product.price.toFixed(2),
      availability,
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: product.price.toFixed(2),
        priceCurrency: "RUB",
        unitText: "DAY",
      },
    },
  };
}

export function categoryBreadcrumbs(shelf: {
  name: string;
  slug: string;
}): BreadcrumbItem[] {
  return [
    { name: "Каталог", path: "/" },
    { name: shelf.name, path: categoryPath(shelf.slug) },
  ];
}

export function productBreadcrumbs(product: {
  name: string;
  slug?: string | null;
  id: number;
  category: { name: string; slug: string; parentId: number | null };
}): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ name: "Каталог", path: "/" }];
  if (product.category.parentId != null) {
    items.push({
      name: product.category.name,
      path: categoryPath(product.category.slug),
    });
  }
  items.push({ name: product.name, path: productPath(product) });
  return items;
}

export function contactsBreadcrumbs(): BreadcrumbItem[] {
  return [
    { name: "Главная", path: "/" },
    { name: "Контакты", path: "/contacts" },
  ];
}

/** Meta/lead: уникальный текст или шаблон. */
export function productSeoDescription(product: {
  name: string;
  price: number;
  categoryName: string;
  description?: string | null;
}): string {
  const custom = product.description?.trim();
  if (custom) {
    return custom.length > 160 ? `${custom.slice(0, 157).trimEnd()}…` : custom;
  }
  const priceLabel = `${product.price.toLocaleString("ru-RU")} ₽/день`;
  return `Аренда ${product.name} — ${priceLabel}. ${product.categoryName}, самовывоз в Москве.`;
}

export function categorySeoDescription(shelf: {
  name: string;
  description?: string | null;
}): string {
  const custom = shelf.description?.trim();
  if (custom) {
    return custom.length > 160 ? `${custom.slice(0, 157).trimEnd()}…` : custom;
  }
  return `Кинооборудование из раздела «${shelf.name}». Суточная аренда, самовывоз в Москве.`;
}
