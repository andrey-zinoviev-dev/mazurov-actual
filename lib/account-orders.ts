import "server-only";

import { prisma } from "@/lib/prisma";

export function formatOrderStatus(statusCode: string | null | undefined): string {
  const code = (statusCode ?? "PENDING").toUpperCase();
  const labels: Record<string, string> = {
    PENDING: "заявка принята",
    CONFIRMED: "подтверждён",
    ACTIVE: "в аренде",
    COMPLETED: "завершён",
    CANCELLED: "отменён",
    CANCELED: "отменён",
  };
  return labels[code] ?? code.toLowerCase();
}

export function formatMoney(value: { toString(): string } | number | string): string {
  const n = typeof value === "number" ? value : Number(value);
  return `${n.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ₽`;
}

export type AccountOrderListItem = {
  id: string;
  orderNumber: number;
  dates: string | null;
  days: number | null;
  statusLabel: string;
  total: string;
  itemCount: number;
  createdAt: Date | null;
};

export async function listCustomerOrders(
  customerId: number,
): Promise<AccountOrderListItem[]> {
  const orders = await prisma.order.findMany({
    where: {
      customerId,
      OR: [{ hidden: false }, { hidden: null }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      dates: true,
      days: true,
      statusCode: true,
      total: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  });

  return orders.map((order) => ({
    id: order.id.toString(),
    orderNumber: order.orderNumber,
    dates: order.dates,
    days: order.days,
    statusLabel: formatOrderStatus(order.statusCode),
    total: formatMoney(order.total),
    itemCount: order._count.items,
    createdAt: order.createdAt,
  }));
}

export type AccountOrderDetail = {
  id: string;
  orderNumber: number;
  dates: string | null;
  days: number | null;
  statusLabel: string;
  total: string;
  deliveryMethod: string | null;
  deliveryAddress: string | null;
  clientName: string | null;
  phone: string | null;
  items: {
    productName: string;
    category: string | null;
    quantity: number;
    pricePerDay: string;
    daysCount: number | null;
    totalPrice: string;
  }[];
  history: {
    status: string;
    statusLabel: string;
    comment: string | null;
    createdAt: Date | null;
  }[];
};

export async function getCustomerOrder(
  customerId: number,
  orderId: bigint,
): Promise<AccountOrderDetail | null> {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      customerId,
      OR: [{ hidden: false }, { hidden: null }],
    },
    select: {
      id: true,
      orderNumber: true,
      dates: true,
      days: true,
      statusCode: true,
      total: true,
      deliveryMethod: true,
      deliveryAddress: true,
      clientName: true,
      phone: true,
      items: {
        select: {
          productName: true,
          category: true,
          quantity: true,
          pricePerDay: true,
          daysCount: true,
          totalPrice: true,
        },
      },
      history: {
        orderBy: { createdAt: "asc" },
        select: {
          status: true,
          comment: true,
          createdAt: true,
        },
      },
    },
  });

  if (!order) return null;

  return {
    id: order.id.toString(),
    orderNumber: order.orderNumber,
    dates: order.dates,
    days: order.days,
    statusLabel: formatOrderStatus(order.statusCode),
    total: formatMoney(order.total),
    deliveryMethod: order.deliveryMethod,
    deliveryAddress: order.deliveryAddress,
    clientName: order.clientName,
    phone: order.phone,
    items: order.items.map((item) => ({
      productName: item.productName,
      category: item.category,
      quantity: item.quantity,
      pricePerDay: formatMoney(item.pricePerDay),
      daysCount: item.daysCount,
      totalPrice: formatMoney(item.totalPrice),
    })),
    history: order.history.map((entry) => ({
      status: entry.status,
      statusLabel: formatOrderStatus(entry.status),
      comment: entry.comment,
      createdAt: entry.createdAt,
    })),
  };
}
