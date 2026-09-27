"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useSyncExternalStore, useState } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs/Breadcrumbs";
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
import {
  computePromoDiscountAmount,
  type PromoDiscountKind,
} from "@/lib/promo-discount";
import "@/styles/account.css";

type AppliedPromo = {
  code: string;
  discountType: PromoDiscountKind;
  discountValue: number;
};

function lineImageSrc(line: CartLine): string {
  return line.imageSrc ?? productImageUrl({ id: line.id, image: null });
}

function formatRub(value: number): string {
  return `${value.toLocaleString("ru-RU")} ₽`;
}

export function CartFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cart = useSyncExternalStore(subscribeCart, readCart, getServerCartSnapshot);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientTelegram, setClientTelegram] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoStatus, setPromoStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [promoMessage, setPromoMessage] = useState("");

  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [successPhone, setSuccessPhone] = useState("");

  // Старые ссылки /cart?step=checkout → одна страница корзины
  useEffect(() => {
    if (searchParams.get("step") === "checkout") {
      router.replace("/cart");
    }
  }, [searchParams, router]);

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

  const billingDays = Math.max(1, days);

  const subtotal = useMemo(() => {
    return itemsTotal * billingDays;
  }, [itemsTotal, billingDays]);

  const discount = useMemo(() => {
    if (!appliedPromo) return 0;
    return computePromoDiscountAmount(
      subtotal,
      appliedPromo.discountType,
      appliedPromo.discountValue,
    );
  }, [appliedPromo, subtotal]);

  const total = Math.max(0, subtotal - discount);

  function clearAppliedPromo() {
    setAppliedPromo(null);
    setPromoStatus("idle");
    setPromoMessage("");
  }

  function handleQuantityChange(id: number, quantity: number) {
    updateCartQuantity(id, quantity);
  }

  function handleRemove(id: number) {
    removeCartItem(id);
  }

  function handleClearCart() {
    clearCart();
    clearAppliedPromo();
  }

  async function handleApplyPromo() {
    const code = promoCode.trim();
    if (!code) {
      clearAppliedPromo();
      setPromoStatus("error");
      setPromoMessage("Введите промокод");
      return;
    }

    setPromoStatus("loading");
    setPromoMessage("");

    try {
      const response = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          phone: clientPhone,
          subtotal,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        code?: string;
        discountType?: PromoDiscountKind;
        discountValue?: number;
        discountAmount?: number;
      };

      if (!response.ok || !data.ok || !data.code || data.discountValue == null) {
        setAppliedPromo(null);
        setPromoStatus("error");
        setPromoMessage(data.error || "Не удалось применить промокод");
        return;
      }

      const discountType = data.discountType === "fixed" ? "fixed" : "percent";
      setAppliedPromo({
        code: data.code,
        discountType,
        discountValue: data.discountValue,
      });
      setPromoCode(data.code);
      setPromoStatus("ok");
      setPromoMessage(
        discountType === "percent"
          ? `применён: −${data.discountValue}%`
          : `применён: −${formatRub(data.discountAmount ?? 0)}`,
      );
    } catch (error) {
      console.error("promo validate failed", error);
      setAppliedPromo(null);
      setPromoStatus("error");
      setPromoMessage("Не удалось проверить промокод");
    }
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
          promoCode: appliedPromo?.code || undefined,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        orderId?: number;
        error?: string;
      };

      if (!response.ok || !data.success || data.orderId == null) {
        throw new Error(data.error || "Не удалось создать заказ");
      }

      clearCart();
      clearAppliedPromo();
      setSuccessPhone(clientPhone.trim());
      setStatus("success");
      setMessage(
        `Заявка принята, номер ${data.orderId}. Менеджер свяжется с вами.`,
      );
    } catch (error) {
      const text = error instanceof Error ? error.message : "Ошибка отправки заказа";
      console.error("Не удалось создать заказ", error);
      setStatus("error");
      setMessage(text);
    }
  }

  if (status === "success") {
    const loginHref = successPhone
      ? `/login?phone=${encodeURIComponent(successPhone)}&next=/account`
      : "/login?next=/account";

    return (
      <section className="cart-page page-split">
        <Breadcrumbs
          items={[
            { label: "главная", href: "/" },
            { label: "корзина" },
          ]}
        />
        <div className="cart-page__body">
          <p className="cart-page__status">{message}</p>
          <div className="cart-success-actions">
            <Link href={loginHref}>посмотрите свои заказы</Link>
            <Link href="/">в каталог</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cart-page page-split">
      <Breadcrumbs
        items={[
          { label: "главная", href: "/" },
          { label: `корзина (${itemCount})` },
        ]}
      />

      <div className="cart-page__body">
        {cart.length === 0 ? (
          <p className="cart-page__empty">корзина пуста.</p>
        ) : (
          <form className="cart-checkout" onSubmit={handleSubmit}>
            <div className="cart-page__layout">
              <div className="cart-page__main">
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
                          {formatRub(item.price * item.quantity * billingDays)}
                        </p>
                        <p className="cart-item__rate">
                          {formatRub(item.price * item.quantity)} × {billingDays}{" "}
                          дн
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <aside className="cart-page__aside">
                <div className="cart-page__divider cart-page__divider--mobile" />

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
                  <p className="cart-field__hint">
                    телефон нужен для связи. по нему же можно войти в личный
                    кабинет — пришлём код в telegram.
                  </p>
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

                <div className="cart-promo">
                  <span className="cart-field__label">промокод</span>
                  <div className="cart-promo__row">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(event) => {
                        setPromoCode(event.target.value);
                        if (appliedPromo || promoStatus !== "idle") {
                          clearAppliedPromo();
                        }
                      }}
                      placeholder="введите промокод"
                      maxLength={50}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="cart-page__text-btn"
                      onClick={handleApplyPromo}
                      disabled={promoStatus === "loading"}
                    >
                      {promoStatus === "loading" ? "…" : "применить"}
                    </button>
                  </div>
                  {promoMessage ? (
                    <p
                      className={
                        promoStatus === "error"
                          ? "cart-field__hint cart-promo__msg cart-promo__msg--error"
                          : "cart-field__hint cart-promo__msg"
                      }
                    >
                      {promoMessage}
                    </p>
                  ) : null}
                </div>

                <dl className="cart-checkout__totals">
                  <div className="cart-checkout__total-row">
                    <dt>скидка</dt>
                    <dd>{formatRub(discount)}</dd>
                  </div>
                  <div className="cart-checkout__total-row cart-checkout__total-row--main">
                    <dt>итого</dt>
                    <dd>
                      {days > 0
                        ? `${formatRub(total)} за ${days} дн.`
                        : formatRub(total)}
                    </dd>
                  </div>
                </dl>

                <p className="cart-checkout__note">
                  после оформления заявки с вами свяжется менеджер для
                  подтверждения заказа и уточнения деталей.
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
              </aside>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
