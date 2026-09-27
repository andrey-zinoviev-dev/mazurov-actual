import "server-only";

import { telegramBotApiUrl, telegramFetchHeaders } from "@/lib/telegram-proxy";
import type { CreateOrderResult } from "@/lib/orders";
import { formatPhoneDisplay } from "@/lib/phone";

const PICKUP_ADDRESS = "Москва, ул. Павла Андреева, 23с10";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function deliveryLabel(method: CreateOrderResult["deliveryMethod"]): string {
  return method === "delivery" ? "Доставка" : "Самовывоз";
}

function deliveryAddressLine(order: CreateOrderResult): string {
  if (order.deliveryMethod === "delivery") {
    return order.deliveryAddress?.trim() || "Не указан";
  }
  return order.deliveryAddress?.trim() || PICKUP_ADDRESS;
}

/** Текст уведомления со всеми параметрами заказа (HTML для Telegram). */
export function formatOrderTelegramMessage(order: CreateOrderResult): string {
  const positions = order.items.length;
  const pieces = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const telegram = order.clientTelegram?.trim().replace(/^@/, "");

  const lines = [
    "────────",
    `📩 <b>НОВЫЙ ЗАКАЗ №${order.orderNumber} (ID: ${order.orderId})</b>`,
    "────────",
    "",
    `👤 <b>Имя:</b> ${escapeHtml(order.clientName)}`,
    `🆔 <b>Telegram:</b> ${telegram ? `@${escapeHtml(telegram)}` : "Не указан"}`,
    `📞 <b>Телефон:</b> ${escapeHtml(formatPhoneDisplay(order.phone))}`,
    `📅 <b>Период:</b> ${escapeHtml(order.dates)}`,
    `⏱️ <b>Дней:</b> ${order.days}`,
    `📦 <b>ТОВАРЫ · ${positions} ПОЗИЦИЙ | ${pieces} шт.</b>`,
    "",
  ];

  if (order.items.length === 0) {
    lines.push("• Нет товаров");
  } else {
    for (const item of order.items) {
      const category = item.category ? ` (${escapeHtml(item.category)})` : "";
      lines.push(
        `• <b>${escapeHtml(item.productName)}</b>${category}`,
        `  ${item.quantity} шт. × ${item.pricePerDay} ₽/день × ${item.daysCount} дн. = <b>${item.totalPrice} ₽</b>`,
      );
    }
  }

  lines.push(
    "",
    "────────",
    `🚚 <b>Способ получения:</b> ${deliveryLabel(order.deliveryMethod)}`,
    `📍 <b>Адрес:</b> ${escapeHtml(deliveryAddressLine(order))}`,
  );

  if (order.promoCode) {
    lines.push(`🏷 <b>Промокод:</b> ${escapeHtml(order.promoCode)}`);
  }

  lines.push(
    `💰 <b>ИТОГО: ${order.total} ₽</b>`,
    "────────",
  );

  return lines.join("\n");
}

async function sendTelegramMessage(text: string): Promise<void> {
  const token = process.env.BOT_TOKEN?.trim();
  const chatId = process.env.CHAT_ID?.trim();

  if (!token || !chatId) {
    console.warn("Telegram notify skipped: BOT_TOKEN or CHAT_ID is not set");
    return;
  }

  const response = await fetch(telegramBotApiUrl(token, "sendMessage"), {
    method: "POST",
    headers: telegramFetchHeaders(),
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram API ${response.status}: ${body}`);
  }
}

/** Шлёт уведомление о заказе. Ошибки не пробрасывает наружу — заказ уже создан. */
export async function notifyNewOrder(order: CreateOrderResult): Promise<void> {
  try {
    await sendTelegramMessage(formatOrderTelegramMessage(order));
  } catch (err) {
    console.error("telegram notify failed", err);
  }
}
