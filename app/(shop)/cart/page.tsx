import type { Metadata } from "next";
import { Suspense } from "react";
import { CartFlow } from "@/components/Cart/CartFlow";
import "./cart-page.css";

export const metadata: Metadata = {
  title: "Корзина — Mazurov Rental",
};

export default function CartPage() {
  return (
    <Suspense fallback={<section className="cart-page" aria-busy="true" />}>
      <CartFlow />
    </Suspense>
  );
}
