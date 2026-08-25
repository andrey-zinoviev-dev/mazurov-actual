"use client";

import { FormEvent, useMemo, useState } from "react";
import { readCart } from "@/lib/cart";
import {
  createOrderPreview,
  inclusiveDayCount,
  type DeliveryMethod,
} from "@/lib/orders";

const PICKUP_ADDRESS = "г. Москва, ул. Павла Андреева, 23с10";

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function CheckoutForm() {
  const [cart] = useState(readCart);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return inclusiveDayCount(parseDateInput(startDate), parseDateInput(endDate));
  }, [startDate, endDate]);

  const total = useMemo(() => {
    if (days < 1) return 0;
    return cart.reduce((sum, item) => sum + item.price * item.quantity * days, 0);
  }, [cart, days]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      const result = await createOrderPreview({
        clientName,
        clientPhone,
        startDate: parseDateInput(startDate),
        endDate: parseDateInput(endDate),
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          pricePerDay: item.price,
        })),
        deliveryMethod,
        deliveryAddress,
        promoCode,
      });

      setStatus("success");
      setMessage(`Заказ принят, номер ${result.orderId}. Подробности в консоли.`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Ошибка отправки заказа";
      console.error("Не удалось создать заказ", error);
      setStatus("error");
      setMessage(text);
    }
  }

  return (
    <form className="checkout" onSubmit={handleSubmit}>
      <h1>Корзина</h1>

      {cart.length === 0 ? (
        <p className="checkout__empty">Корзина пуста — заказ пока отправить нельзя.</p>
      ) : (
        <ul className="checkout__items">
          {cart.map((item) => (
            <li key={item.id}>
              {item.name} × {item.quantity} — {item.price.toLocaleString("ru-RU")} ₽/день
            </li>
          ))}
        </ul>
      )}

      <label className="checkout__field">
        Имя, фамилия
        <input
          type="text"
          value={clientName}
          onChange={(event) => setClientName(event.target.value)}
          placeholder="Иван Иванов"
          autoComplete="name"
        />
      </label>

      <label className="checkout__field">
        Телефон
        <input
          type="tel"
          value={clientPhone}
          onChange={(event) => setClientPhone(event.target.value)}
          placeholder="+7 (999) 123-45-67"
          autoComplete="tel"
        />
      </label>

      <div className="checkout__dates">
        <label className="checkout__field">
          Начало аренды
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label className="checkout__field">
          Конец аренды
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
      </div>

      <fieldset className="checkout__field">
        <legend>Способ получения</legend>
        <label className="checkout__radio">
          <input
            type="radio"
            name="deliveryMethod"
            value="pickup"
            checked={deliveryMethod === "pickup"}
            onChange={() => setDeliveryMethod("pickup")}
          />
          Самовывоз — {PICKUP_ADDRESS}
        </label>
        <label className="checkout__radio">
          <input
            type="radio"
            name="deliveryMethod"
            value="delivery"
            checked={deliveryMethod === "delivery"}
            onChange={() => setDeliveryMethod("delivery")}
          />
          Доставка
        </label>
      </fieldset>

      {deliveryMethod === "delivery" ? (
        <label className="checkout__field">
          Адрес доставки
          <input
            type="text"
            value={deliveryAddress}
            onChange={(event) => setDeliveryAddress(event.target.value)}
            placeholder="Город, улица, дом"
            autoComplete="street-address"
          />
        </label>
      ) : null}

      <label className="checkout__field">
        Промокод
        <input
          type="text"
          value={promoCode}
          onChange={(event) => setPromoCode(event.target.value)}
          placeholder="Необязательно"
          maxLength={20}
          autoComplete="off"
        />
      </label>

      <p className="checkout__total">
        {days > 0
          ? `Предварительный итог: ${total.toLocaleString("ru-RU")} ₽ за ${days} дн.`
          : "Выберите даты, чтобы увидеть сумму"}
      </p>

      <button type="submit" disabled={status === "submitting" || cart.length === 0}>
        {status === "submitting" ? "Отправка…" : "Сделать заказ"}
      </button>

      {message ? (
        <p className={status === "error" ? "checkout__status checkout__status--error" : "checkout__status"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
