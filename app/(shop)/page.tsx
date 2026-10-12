import type { Metadata } from "next";
import { CatalogShelfList } from "@/components/CatalogShelfList/CatalogShelfList";
import { PageHeading } from "@/components/PageHeading/PageHeading";
import { getAllShelvesWithProducts } from "@/lib/catalog";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: SITE.defaultTitle,
  },
  description: SITE.defaultDescription,
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE.defaultTitle,
    description: SITE.defaultDescription,
    url: "/",
    images: [{ url: SITE.defaultOgImagePath }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.defaultTitle,
    description: SITE.defaultDescription,
    images: [SITE.defaultOgImagePath],
  },
};

export default async function HomePage() {
  const shelves = await getAllShelvesWithProducts();
  return (
    <div className="page-split">
      <PageHeading
        title="Аренда кинооборудования в Москве"
        lead="Камеры, свет и звук в суточную аренду · самовывоз"
      />
      <CatalogShelfList shelves={shelves} />
    </div>
  );
}
