import type { Metadata } from "next";
import { notFound } from "next/navigation";
// import { Breadcrumbs } from "@/components/Breadcrumbs/Breadcrumbs";
import { CatalogShelfList } from "@/components/CatalogShelfList/CatalogShelfList";
import { JsonLd } from "@/components/JsonLd/JsonLd";
import { PageHeading } from "@/components/PageHeading/PageHeading";
import { categoryPath, getShelfBySlug } from "@/lib/catalog";
import {
  breadcrumbListJsonLd,
  categoryBreadcrumbs,
} from "@/lib/seo-jsonld";
import { SITE } from "@/lib/site";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const shelf = await getShelfBySlug(slug);

  if (!shelf) {
    return {
      title: "Категория не найдена",
      robots: { index: false, follow: false },
    };
  }

  const title = `${shelf.name} в аренду в Москве`;
  const description = `Кинооборудование из раздела «${shelf.name}». Суточная аренда, самовывоз в Москве.`;
  const path = categoryPath(shelf.slug);

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} — ${SITE.name}`,
      description,
      url: path,
      images: [{ url: SITE.defaultOgImagePath }],
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const shelf = await getShelfBySlug(slug);

  if (!shelf) {
    notFound();
  }

  return (
    <div className="page-split">
      <JsonLd data={breadcrumbListJsonLd(categoryBreadcrumbs(shelf))} />
      {/* <Breadcrumbs
        items={[
          { label: "каталог", href: "/" },
          { label: shelf.name },
        ]}
      /> */}
      <PageHeading
        title={`${shelf.name} в аренду в Москве`}
        lead={`Кинооборудование из раздела «${shelf.name}». Суточная аренда, самовывоз.`}
      />
      <CatalogShelfList shelves={[shelf]} showSectionTitles={false} />
    </div>
  );
}
