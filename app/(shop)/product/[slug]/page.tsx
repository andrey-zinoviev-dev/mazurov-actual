import type { Metadata } from "next";
import Image from "next/image";
import { notFound, permanentRedirect } from "next/navigation";
// import { Breadcrumbs } from "@/components/Breadcrumbs/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd/JsonLd";
import { PageHeading } from "@/components/PageHeading/PageHeading";
import { ProductAddToCart } from "@/components/ProductAddToCart/ProductAddToCart";
import {
  // categoryPath,
  getProductById,
  parseProductParam,
  productImageUrl,
  productPath,
} from "@/lib/catalog";
import {
  breadcrumbListJsonLd,
  productBreadcrumbs,
  productJsonLd,
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

  const priceLabel = `${Number(product.price).toLocaleString("ru-RU")} ₽/день`;
  const title = `Аренда ${product.name}`;
  const description = `Аренда ${product.name} — ${priceLabel}. ${product.category.name}, самовывоз в Москве.`;
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

  const priceLabel = `${Number(product.price).toLocaleString("ru-RU")} ₽/день`;
  const imageSrc = productImageUrl(product);
  const price = Number(product.price);
  // const shelf = product.category.parentId != null ? product.category : null;

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
          }),
          breadcrumbListJsonLd(productBreadcrumbs(product)),
        ]}
      />
      {/* <Breadcrumbs
        items={[
          { label: "каталог", href: "/" },
          ...(shelf
            ? [{ label: shelf.name, href: categoryPath(shelf.slug) }]
            : []),
          { label: product.name },
        ]}
      /> */}
      <PageHeading
        title={product.name}
        lead={`Аренда ${product.name} — ${priceLabel}. ${product.category.name}, самовывоз в Москве.`}
      />

      <div className="product-page__stub">
        <div className="product-page__media">
          <Image
            src={imageSrc}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, 480px"
            className="product-page__image"
            priority
          />
        </div>

        <div className="product-page__info">
          <p className="product-page__price">{priceLabel}</p>
          <ProductAddToCart
            id={product.id}
            name={product.name}
            price={price}
            imageSrc={imageSrc}
          />
          <p className="product-page__note">
            Полная страница товара пока в разработке. Здесь скоро появятся
            описание и характеристики.
          </p>
        </div>
      </div>
    </section>
  );
}
