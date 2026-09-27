import { Suspense } from "react";
import { CatalogNav } from "@/components/CatalogNav/CatalogNav";
import { FavoritesProvider } from "@/components/FavoritesProvider";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar/MobileTabBar";
import { getAllNavRoots } from "@/lib/catalog";
import { getSessionCustomer } from "@/lib/session";
import "@/components/CatalogNav/CatalogNav.css";

async function ShopCatalogNav() {
  const navRoots = await getAllNavRoots();
  return <CatalogNav title="Каталог" allHref="/" roots={navRoots} />;
}

export default async function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const customer = await getSessionCustomer();
  const headerCustomer = customer
    ? { id: customer.id, phone: customer.phone }
    : null;

  return (
    <FavoritesProvider>
      <Header customer={headerCustomer} />
      <main className="shop-main">
        <div className="catalog-layout">
          <Suspense
            fallback={
              <div className="catalog-nav">
                <span className="catalog-nav__trigger" aria-hidden="true">
                  [ категории ▼ ]
                </span>
              </div>
            }
          >
            <ShopCatalogNav />
          </Suspense>
          <div className="catalog-layout__content">{children}</div>
        </div>
      </main>
      <MobileTabBar customer={headerCustomer} />
    </FavoritesProvider>
  );
}
