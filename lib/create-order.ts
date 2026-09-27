import "server-only";

import { findOrCreateCustomer } from "@/lib/customers";
import {
  inclusiveDayCount,
  parseDateOnly,
  type CreateOrderRequest,
  type CreateOrderResult,
} from "@/lib/orders";
import { normalizePhone } from "@/lib/phone";
import { evaluatePromo, PromoError, recordPromoUsage } from "@/lib/promo";
import { roundMoney } from "@/lib/promo-discount";
import { prisma } from "@/lib/prisma";

function money(value: number): string {
  return value.toFixed(2);
}

function formatDatesLabel(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  return `${fmt(start)} — ${fmt(end)}`;
}

/** Legacy-поле для бота/старых интеграций: telegram → нормализованный phone → web. */
function resolveUserId(body: CreateOrderRequest, normalizedPhone: string): string {
  const telegram = body.clientTelegram?.trim().replace(/^@/, "");
  if (telegram) return telegram.slice(0, 50);
  return normalizedPhone.slice(0, 50) || "web";
}

/** Атомарный ++order_number (одна строка id=1). */
async function allocateOrderNumber(
  tx: Pick<typeof prisma, "orderCounter">,
): Promise<number> {
  await tx.orderCounter.upsert({
    where: { id: 1 },
    create: { id: 1, lastNumber: 0 },
    update: {},
  });

  const counter = await tx.orderCounter.update({
    where: { id: 1 },
    data: { lastNumber: { increment: 1 } },
    select: { lastNumber: true },
  });

  return counter.lastNumber;
}

/** Создаёт заказ: customer + orders + order_items + order_status_history. */
export async function createOrder(
  body: CreateOrderRequest,
): Promise<CreateOrderResult> {
  const start = parseDateOnly(body.startDate);
  const end = parseDateOnly(body.endDate);
  if (!start || !end) {
    throw new Error("Некорректные даты аренды");
  }

  const phone = normalizePhone(body.clientPhone);
  if (!phone) {
    throw new Error("Некорректный номер телефона");
  }

  const days = inclusiveDayCount(start, end);
  const productIds = [...new Set(body.items.map((item) => item.productId))];

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: { category: { select: { name: true } } },
  });

  if (products.length !== productIds.length) {
    throw new Error("Некоторые товары недоступны или не найдены");
  }

  const productById = new Map(products.map((product) => [product.id, product]));

  const lineItems = body.items.map((item) => {
    const product = productById.get(item.productId);
    if (!product) {
      throw new Error(`Товар ${item.productId} не найден`);
    }

    const pricePerDay = Number(product.price);
    const totalPrice = pricePerDay * item.quantity * days;

    return {
      productId: product.id,
      productName: product.name.slice(0, 500),
      category: product.category.name.slice(0, 100),
      quantity: item.quantity,
      pricePerDay: money(pricePerDay),
      daysCount: days,
      totalPrice: money(totalPrice),
      lineTotal: totalPrice,
    };
  });

  const subtotalAmount = roundMoney(
    lineItems.reduce((sum, line) => sum + line.lineTotal, 0),
  );
  const clientName = body.clientName.trim();
  const clientTelegram = body.clientTelegram?.trim().replace(/^@/, "") || undefined;
  const userId = resolveUserId(body, phone);
  const dates = formatDatesLabel(start, end);
  const deliveryAddress = body.deliveryAddress?.trim() || null;
  const rawPromo = body.promoCode?.trim() || null;
  /** Снимок как ввёл клиент (для менеджера); идентичность — в customer.phone. */
  const phoneSnapshot = body.clientPhone.trim().slice(0, 50);

  const order = await prisma.$transaction(async (tx) => {
    const customer = await findOrCreateCustomer(phone, clientName, tx);
    const orderNumber = await allocateOrderNumber(tx);

    let promoCode: string | null = null;
    let promoDiscountPercent: number | null = null;
    let promoDiscountAmount: string | null = null;
    let totalAmount = subtotalAmount;

    if (rawPromo) {
      const promo = await evaluatePromo(
        {
          code: rawPromo,
          subtotal: subtotalAmount,
          phone,
          userId,
          requireUserContext: true,
        },
        tx,
      );
      if (!promo.ok) {
        throw new PromoError(promo.error);
      }
      promoCode = promo.code;
      promoDiscountPercent = promo.discountPercent;
      promoDiscountAmount = money(promo.discountAmount);
      totalAmount = promo.total;
    }

    const created = await tx.order.create({
      data: {
        orderNumber,
        userId,
        userName: clientName,
        clientName,
        phone: phoneSnapshot,
        customerId: customer.id,
        dates,
        days,
        total: money(totalAmount),
        subtotal: money(subtotalAmount),
        status: "PENDING",
        statusCode: "PENDING",
        hidden: false,
        deliveryMethod: body.deliveryMethod,
        deliveryAddress,
        promoCode,
        promoDiscountPercent,
        promoDiscountAmount,
        promoRejected: false,
        rawData: JSON.stringify(body),
        items: {
          create: lineItems.map(({ lineTotal: _, ...line }) => line),
        },
        history: {
          create: {
            status: "PENDING",
            comment: "Заказ создан с сайта",
          },
        },
      },
      select: { id: true, orderNumber: true },
    });

    if (promoCode) {
      await recordPromoUsage(tx, {
        code: promoCode,
        userId,
        orderId: created.id,
      });
    }

    return {
      ...created,
      customerId: customer.id,
      promoCode,
      total: money(totalAmount),
    };
  });

  return {
    orderId: Number(order.id),
    orderNumber: order.orderNumber,
    customerId: order.customerId,
    clientName,
    phone,
    clientTelegram,
    userId,
    dates,
    days,
    items: lineItems.map(
      ({ productName, category, quantity, pricePerDay, daysCount, totalPrice }) => ({
        productName,
        category,
        quantity,
        pricePerDay,
        daysCount,
        totalPrice,
      }),
    ),
    deliveryMethod: body.deliveryMethod,
    deliveryAddress,
    promoCode: order.promoCode,
    total: order.total,
  };
}
