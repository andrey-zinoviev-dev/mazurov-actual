import { Header } from "@/components/Header";

export default function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="shop-main">{children}</main>
    </>
  );
}
