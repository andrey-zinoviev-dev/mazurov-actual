import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs/Breadcrumbs";
import { getCustomerOrder } from "@/lib/account-orders";
import { getSessionCustomer } from "@/lib/session";
import "@/app/(shop)/cart/cart-page.css";
import "@/styles/account.css";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Заявка ${id} — Mazurov Rental`,
  };
}

export default async function AccountOrderPage({ params }: Props) {
  const customer = await getSessionCustomer();
  if (!customer) {
    const { id } = await params;
    redirect(`/login?next=${encodeURIComponent(`/account/orders/${id}`)}`);
  }

  const { id } = await params;
  let orderId: bigint;
  try {
    orderId = BigInt(id);
  } catch {
    notFound();
  }

  const order = await getCustomerOrder(customer.id, orderId);
  if (!order) notFound();

  const deliveryLabel =
    order.deliveryMethod === "delivery" ? "доставка" : "самовывоз";

  return (
    <section className="account-page page-split">
      <Breadcrumbs
        items={[
          { label: "главная", href: "/" },
          { label: "мои заказы", href: "/account" },
          { label: `№${order.orderNumber}` },
        ]}
      />

      <div className="account-page__body">
        <div className="account-page__head">
          <h1>заявка №{order.orderNumber}</h1>
          <Link href="/account" className="cart-page__text-btn">
            к списку
          </Link>
        </div>

        <div className="account-detail__block">
          <h2 className="account-detail__label">статус</h2>
          <p className="account-detail__row">
            <span>{order.statusLabel}</span>
          </p>
          {order.dates ? (
            <dl>
              <div className="account-detail__row">
                <dt>период</dt>
                <dd>
                  {order.dates}
                  {order.days ? ` · ${order.days} дн.` : null}
                </dd>
              </div>
            </dl>
          ) : null}
          <dl>
            <div className="account-detail__row">
              <dt>получение</dt>
              <dd>{deliveryLabel}</dd>
            </div>
            {order.deliveryAddress ? (
              <div className="account-detail__row">
                <dt>адрес</dt>
                <dd>{order.deliveryAddress}</dd>
              </div>
            ) : null}
            <div className="account-detail__row">
              <dt>итого</dt>
              <dd>{order.total}</dd>
            </div>
          </dl>
        </div>

        <div className="account-detail__block">
          <h2 className="account-detail__label">состав</h2>
          <ul className="account-detail__items">
            {order.items.map((item, index) => (
              <li key={`${item.productName}-${index}`} className="account-detail__item">
                <div>{item.productName}</div>
                <p className="account-detail__item-meta">
                  {item.quantity} шт. × {item.pricePerDay}/день
                  {item.daysCount ? ` × ${item.daysCount} дн.` : null}
                  {" = "}
                  {item.totalPrice}
                  {item.category ? ` · ${item.category}` : null}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {order.history.length > 0 ? (
          <div className="account-detail__block">
            <h2 className="account-detail__label">история</h2>
            <ul className="account-detail__history">
              {order.history.map((entry, index) => (
                <li
                  key={`${entry.status}-${index}`}
                  className="account-detail__history-item"
                >
                  <strong>{entry.statusLabel}</strong>
                  {entry.comment ? ` — ${entry.comment}` : null}
                  {entry.createdAt ? (
                    <span className="account-detail__history-time">
                      {entry.createdAt.toLocaleString("ru-RU")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="account-form__meta">
          вопросы по заявке —{" "}
          <Link href="/contacts">контакты</Link>
        </p>
      </div>
    </section>
  );
}
