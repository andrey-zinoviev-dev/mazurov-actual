import type { Metadata } from "next";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd/JsonLd";
import { ProductAddToCart } from "@/components/ProductAddToCart/ProductAddToCart";
import {
  categoryPath,
  getProductById,
  parseProductParam,
  productImageUrl,
  productPath,
} from "@/lib/catalog";
import {
  breadcrumbListJsonLd,
  productBreadcrumbs,
  productJsonLd,
  productSeoDescription,
} from "@/lib/seo-jsonld";
import { SITE } from "@/lib/site";
import "./product-page.css";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug: raw } = await params;
  const parsed = parseProductParam(raw);
  if (parsed == null) {
    return {
      title: "Товар не найден",
      robots: { index: false, follow: false },
    };
  }

  const product = await getProductById(parsed.id);
  if (!product) {
    return {
      title: "Товар не найден",
      robots: { index: false, follow: false },
    };
  }

  const title = `Аренда ${product.name}`;
  const description = productSeoDescription({
    name: product.name,
    price: Number(product.price),
    categoryName: product.category.name,
    description: product.description,
  });
  const path = productPath(product);
  const image = productImageUrl(product);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title: `${title} — ${SITE.name}`,
      description,
      url: path,
      images: [{ url: image }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — ${SITE.name}`,
      description,
      images: [image],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug: raw } = await params;
  const parsed = parseProductParam(raw);
  if (parsed == null) {
    notFound();
  }

  const product = await getProductById(parsed.id);
  if (!product) {
    notFound();
  }

  const canonical = productPath(product);
  if (canonical !== `/product/${raw}`) {
    permanentRedirect(canonical);
  }

  const price = Number(product.price);
  const priceLabel = `${price.toLocaleString("ru-RU")} ₽/день`;
  const imageSrc = productImageUrl(product);
  const shelf = product.category.parentId != null ? product.category : null;
  const description = product.description?.trim() || null;

  return (
    <section className="product-page page-split">
      <JsonLd
        data={[
          productJsonLd({
            id: product.id,
            slug: product.slug,
            name: product.name,
            price,
            stock: product.stock,
            imageUrl: imageSrc,
            categoryName: product.category.name,
            description,
          }),
          breadcrumbListJsonLd(productBreadcrumbs(product)),
        ]}
      />
      <Breadcrumbs
        items={[
          { label: "каталог", href: "/" },
          ...(shelf
            ? [{ label: shelf.name, href: categoryPath(shelf.slug) }]
            : []),
          { label: product.name },
        ]}
      />

      <div className="product-page__layout">
        <div className="product-page__media">
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            sizes="(max-width: 899px) 100vw, 380px"
            className="product-page__image"
            priority
          />
        </div>

        <div className="product-page__info">
          <header className="product-page__header">
            <h1 className="product-page__title">{product.name}</h1>
            <p className="product-page__meta">{product.category.name}</p>
          </header>

          {description ? (
            <section className="product-page__description">
              <h2 className="product-page__description-title">Описание</h2>
              <div className="product-page__description-body">
                {description
                  .split(/\n+/)
                  .map((paragraph: string, index: number) => (
                    <p key={index}>{paragraph}</p>
                  ))}
              </div>
            </section>
          ) : null}

          <div className="product-page__actions">
            <p className="product-page__price">{priceLabel}</p>
            <ProductAddToCart
              id={product.id}
              name={product.name}
              price={price}
              imageSrc={imageSrc}
              className="product-page__cart"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
