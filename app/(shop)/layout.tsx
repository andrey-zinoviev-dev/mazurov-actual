import { FavoritesProvider } from "@/components/FavoritesProvider";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar/MobileTabBar";

export default function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <FavoritesProvider>
      <Header />
      <main className="shop-main">{children}</main>
      <MobileTabBar />
    </FavoritesProvider>
  );
}
