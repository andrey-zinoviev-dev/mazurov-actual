import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs/Breadcrumbs";
import { ProductAddToCart } from "@/components/ProductAddToCart/ProductAddToCart";
import {
  categoryPath,
  getProductById,
  productImageUrl,
} from "@/lib/catalog";
import "./product-page.css";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

function parseProductId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = parseProductId(rawId);
  if (id == null) {
    return { title: "Товар не найден" };
  }

  const product = await getProductById(id);
  if (!product) {
    return { title: "Товар не найден" };
  }

  return { title: `${product.name} — Mazurov Rental` };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id: rawId } = await params;
  const id = parseProductId(rawId);
  if (id == null) {
    notFound();
  }

  const product = await getProductById(id);
  if (!product) {
    notFound();
  }

  const priceLabel = `${Number(product.price).toLocaleString("ru-RU")} ₽/день`;
  const shelf = product.category.parentId != null ? product.category : null;

  return (
    <section className="product-page page-split">
      <Breadcrumbs
        items={[
          { label: "каталог", href: "/" },
          ...(shelf
            ? [{ label: shelf.name, href: categoryPath(shelf.slug) }]
            : []),
          { label: product.name },
        ]}
      />

      <div className="product-page__stub">
        <div className="product-page__media">
          <Image
            src={productImageUrl(product)}
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
            price={Number(product.price)}
            imageSrc={productImageUrl(product)}
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
