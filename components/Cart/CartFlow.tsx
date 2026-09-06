"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useSyncExternalStore, useState } from "react";
import {
  clearCart,
  getServerCartSnapshot,
  removeCartItem,
  readCart,
  subscribeCart,
  updateCartQuantity,
  type CartLine,
} from "@/lib/cart";
import { productImageUrl } from "@/lib/product-image";
import {
  inclusiveDayCount,
  parseDateOnly,
} from "@/lib/orders";

function lineImageSrc(line: CartLine): string {
  return line.imageSrc ?? productImageUrl({ id: line.id, image: null });
}

function formatRub(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

export function CartFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCheckoutStep = searchParams.get("step") === "checkout";

  const cart = useSyncExternalStore(subscribeCart, readCart, getServerCartSnapshot);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientTelegram, setClientTelegram] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [discount, setDiscount] = useState(0);

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isCheckoutStep && cart.length === 0) {
      router.replace("/cart");
    }
  }, [isCheckoutStep, cart.length, router]);

  const itemCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const itemsTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );

  const days = useMemo(() => {
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);
    if (!start || !end) return 0;
    return inclusiveDayCount(start, end);
  }, [startDate, endDate]);

  const subtotal = useMemo(() => {
    return itemsTotal * Math.max(1, days);
  }, [itemsTotal, days]);

  const total = Math.max(0, subtotal - discount);

  function handleQuantityChange(id: number, quantity: number) {
    updateCartQuantity(id, quantity);
  }

  function handleRemove(id: number) {
    removeCartItem(id);
  }

  function handleClearCart() {
    clearCart();
    if (isCheckoutStep) {
      router.replace("/cart");
    }
  }

  function goToCheckout() {
    router.push("/cart?step=checkout");
  }

  function goToCart() {
    router.push("/cart");
  }

  function handleApplyPromo() {
    const code = promoCode.trim();
    setAppliedPromo(code);
    setDiscount(0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientPhone,
          clientTelegram: clientTelegram.trim() || undefined,
          startDate,
          endDate,
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
            pricePerDay: item.price,
          })),
          deliveryMethod: "pickup",
          promoCode: appliedPromo || undefined,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        orderId?: number;
        stub?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success || data.orderId == null) {
        throw new Error(data.error || "Не удалось создать заказ");
      }

      clearCart();
      setStatus("success");
      setMessage(
        data.stub
          ? `Заглушка: заказ не сохранён, номер ${data.orderId}.`
          : `Заявка принята, номер ${data.orderId}. Менеджер свяжется с вами.`,
      );
    } catch (error) {
      const text = error instanceof Error ? error.message : "Ошибка отправки заказа";
      console.error("Не удалось создать заказ", error);
      setStatus("error");
      setMessage(text);
    }
  }

  if (status === "success") {
    return (
      <section className="cart-page page-split">
        <h1>корзина</h1>
        <div className="cart-page__body">
          <p className="cart-page__status">{message}</p>
        </div>
      </section>
    );
  }

  if (!isCheckoutStep) {
    return (
      <section className="cart-page page-split">
        <h1>корзина ({itemCount})</h1>

        <div className="cart-page__body">
        {cart.length === 0 ? (
          <p className="cart-page__empty">корзина пуста.</p>
        ) : (
          <>
            <div className="cart-page__section-head">
              <h2>ваш заказ</h2>
              <button
                type="button"
                className="cart-page__text-btn"
                onClick={handleClearCart}
              >
                очистить корзину
              </button>
            </div>

            <ul className="cart-page__items">
              {cart.map((item) => (
                <li key={item.id} className="cart-item">
                  <div className="cart-item__thumb">
                    <Image
                      src={lineImageSrc(item)}
                      alt=""
                      fill
                      sizes="72px"
                      className="cart-item__image"
                    />
                  </div>

                  <h3 className="cart-item__title">{item.name}</h3>

                  <button
                    type="button"
                    className="cart-item__remove"
                    aria-label={`Убрать ${item.name} из корзины`}
                    onClick={() => handleRemove(item.id)}
                  >
                    ×
                  </button>

                  <div className="cart-item__qty" aria-label="Количество">
                    <button
                      type="button"
                      className="cart-item__qty-btn"
                      aria-label="Уменьшить количество"
                      onClick={() =>
                        handleQuantityChange(item.id, item.quantity - 1)
                      }
                    >
                      −
                    </button>
                    <span className="cart-item__qty-value">{item.quantity}</span>
                    <button
                      type="button"
                      className="cart-item__qty-btn"
                      aria-label="Увеличить количество"
                      onClick={() =>
                        handleQuantityChange(item.id, item.quantity + 1)
                      }
                    >
                      +
                    </button>
                  </div>

                  <div className="cart-item__price-block">
                    <p className="cart-item__price">
                      {formatRub(item.price * item.quantity)}
                    </p>
                    <p className="cart-item__rate">
                      {formatRub(item.price * item.quantity)} × 1 дн
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="cart-page__divider" />

            <div className="cart-promo">
              <span className="cart-field__label">промокод</span>
              <div className="cart-promo__row">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(event) => setPromoCode(event.target.value)}
                  placeholder="введите промокод"
                  maxLength={20}
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="cart-page__text-btn"
                  onClick={handleApplyPromo}
                >
                  применить
                </button>
              </div>
            </div>

            <dl className="cart-checkout__totals">
              <div className="cart-checkout__total-row">
                <dt>скидка</dt>
                <dd>{formatRub(discount)}</dd>
              </div>
              <div className="cart-checkout__total-row cart-checkout__total-row--main">
                <dt>предварительный итог</dt>
                <dd>
                  {days > 0
                    ? `${formatRub(total)} за ${days} дн.`
                    : formatRub(total)}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              className="cart-page__primary-btn"
              disabled={cart.length === 0}
              onClick={goToCheckout}
            >
              оформить заказ
            </button>
          </>
        )}
        </div>
      </section>
    );
  }

  return (
    <section className="cart-page page-split">
      <h1>оформление</h1>

      <form className="cart-checkout" onSubmit={handleSubmit}>
        <button type="button" className="cart-page__back" onClick={goToCart}>
          ← корзина
        </button>
        <label className="cart-field">
          <span className="cart-field__label">период аренды</span>
          <div className="cart-field__dates">
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              aria-label="Начало аренды"
              required
            />
            <span className="cart-field__dates-sep">—</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
              aria-label="Конец аренды"
              required
            />
          </div>
        </label>

        <label className="cart-field">
          <span className="cart-field__label">имя, фамилия</span>
          <input
            type="text"
            value={clientName}
            onChange={(event) => setClientName(event.target.value)}
            placeholder="иван иванов"
            autoComplete="name"
            required
          />
        </label>

        <label className="cart-field">
          <span className="cart-field__label">телефон</span>
          <input
            type="tel"
            value={clientPhone}
            onChange={(event) => setClientPhone(event.target.value)}
            placeholder="+7 (999) 123-45-67"
            autoComplete="tel"
            required
          />
        </label>

        <label className="cart-field">
          <span className="cart-field__label">telegram</span>
          <input
            type="text"
            value={clientTelegram}
            onChange={(event) => setClientTelegram(event.target.value)}
            placeholder="@username"
            autoComplete="off"
          />
        </label>

        <div className="cart-page__divider" />

        <h2 className="cart-page__subheading">ваш заказ</h2>
        <ul className="cart-checkout__review">
          {cart.map((item) => (
            <li key={item.id} className="cart-checkout__review-row">
              <span className="cart-checkout__review-name">{item.name}</span>
              <span className="cart-checkout__review-qty">{item.quantity} шт</span>
              <span className="cart-checkout__review-price">
                {days > 0
                  ? formatRub(item.price * item.quantity * days)
                  : `${formatRub(item.price)}/день`}
              </span>
            </li>
          ))}
        </ul>

        <p className="cart-checkout__note">
          после оформления заявки с вами свяжется менеджер для подтверждения заказа
          и уточнения деталей.
        </p>

        <button
          type="submit"
          className="cart-page__primary-btn"
          disabled={status === "submitting" || cart.length === 0}
        >
          {status === "submitting" ? "отправка…" : "оставить заявку"}
        </button>

        {message ? (
          <p
            className={
              status === "error"
                ? "cart-page__status cart-page__status--error"
                : "cart-page__status"
            }
          >
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
