import type { Metadata } from "next";
import { CatalogShelfList } from "@/components/CatalogShelfList/CatalogShelfList";
import { JsonLd } from "@/components/JsonLd/JsonLd";
import { PageHeading } from "@/components/PageHeading/PageHeading";
import { getAllShelvesWithProducts } from "@/lib/catalog";
import { breadcrumbListJsonLd } from "@/lib/seo-jsonld";
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
};

export default async function HomePage() {
  const shelves = await getAllShelvesWithProducts();
  return (
    <div className="page-split">
      <JsonLd
        data={breadcrumbListJsonLd([{ name: "Каталог", path: "/" }])}
      />
      <PageHeading
        title="Аренда кинооборудования в Москве"
        lead="Камеры, свет и звук в суточную аренду · самовывоз"
      />
      <CatalogShelfList shelves={shelves} />
    </div>
  );
}
