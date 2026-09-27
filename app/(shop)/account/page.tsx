import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs/Breadcrumbs";
import { LogoutButton } from "@/components/Account/LogoutButton";
import { listCustomerOrders } from "@/lib/account-orders";
import { formatPhoneDisplay } from "@/lib/phone";
import { getSessionCustomer } from "@/lib/session";
import "@/app/(shop)/cart/cart-page.css";
import "@/styles/account.css";

export const metadata: Metadata = {
  title: "Мои заказы — Mazurov Rental",
};

export default async function AccountPage() {
  const customer = await getSessionCustomer();
  if (!customer) {
    redirect("/login?next=/account");
  }

  const orders = await listCustomerOrders(customer.id);

  return (
    <section className="account-page page-split">
      <Breadcrumbs
        items={[
          { label: "главная", href: "/" },
          { label: "мои заказы" },
        ]}
      />
      <div className="account-page__body">
        <div className="account-page__head">
          {/* <h1>мои заказы</h1> */}
          <LogoutButton variant="danger" />
        </div>

        <p className="account-page__phone">
          Аккаунт {formatPhoneDisplay(customer.phone)}
          {customer.name ? ` · ${customer.name}` : null}
        </p>

        {orders.length === 0 ? (
          <p className="account-page__empty">
            заказов пока нет.{" "}
            <Link href="/">перейти в каталог</Link>
          </p>
        ) : (
          <ul className="account-orders">
            {orders.map((order) => (
              <li key={order.id} className="account-orders__item">
                <Link
                  href={`/account/orders/${order.id}`}
                  className="account-orders__link"
                >
                  <span className="account-orders__num">
                    заявка №{order.orderNumber}
                  </span>
                  <span className="account-orders__status">
                    {order.statusLabel}
                  </span>
                  <span className="account-orders__meta">
                    {order.dates ?? "даты не указаны"}
                    {order.itemCount > 0
                      ? ` · ${order.itemCount} поз.`
                      : null}
                  </span>
                  <span className="account-orders__total">{order.total}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
