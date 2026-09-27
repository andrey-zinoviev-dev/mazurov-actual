import { CatalogShelfList } from "@/components/CatalogShelfList/CatalogShelfList";
import { getAllShelvesWithProducts } from "@/lib/catalog";

export default async function HomePage() {
  const shelves = await getAllShelvesWithProducts();
  return <CatalogShelfList shelves={shelves} />;
}
