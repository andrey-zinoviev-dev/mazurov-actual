import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs/Breadcrumbs";
import { LoginForm } from "@/components/Account/LoginForm";
import { getSessionCustomer } from "@/lib/session";
import "@/app/(shop)/cart/cart-page.css";
import "@/styles/account.css";

export const metadata: Metadata = {
  title: "Вход — Mazurov Rental",
};

type Props = {
  searchParams: Promise<{ phone?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const customer = await getSessionCustomer();
  const params = await searchParams;

  if (customer) {
    const next = params.next;
    if (next && next.startsWith("/") && !next.startsWith("//")) {
      redirect(next);
    }
    redirect("/account");
  }

  const initialPhone = typeof params.phone === "string" ? params.phone : "";

  return (
    <section className="account-page account-page--login page-split">
      <Breadcrumbs
        items={[
          { label: "главная", href: "/" },
          { label: "вход" },
        ]}
      />
      <div className="account-page__body account-page__body--centered">
        <div className="account-page__head account-page__head--centered">
          <h1>вход</h1>
        </div>
        <Suspense fallback={<p className="account-page__empty">загрузка…</p>}>
          <LoginForm initialPhone={initialPhone} />
        </Suspense>
      </div>
    </section>
  );
}
