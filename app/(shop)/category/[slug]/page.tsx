import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs/Breadcrumbs";
import { CatalogShelfList } from "@/components/CatalogShelfList/CatalogShelfList";
import { getShelfBySlug, getShelfSlugs } from "@/lib/catalog";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getShelfSlugs();
  return slugs.map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const shelf = await getShelfBySlug(slug);

  if (!shelf) {
    return { title: "Категория не найдена" };
  }

  return { title: `${shelf.name} — Mazurov Rental` };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const shelf = await getShelfBySlug(slug);

  if (!shelf) {
    notFound();
  }

  return (
    <div className="page-split">
      <Breadcrumbs
        items={[
          { label: "каталог", href: "/" },
          { label: shelf.name },
        ]}
      />
      <CatalogShelfList shelves={[shelf]} showSectionTitles={false} />
    </div>
  );
}
