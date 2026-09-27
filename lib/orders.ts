import { normalizePhone } from "@/lib/phone";

export type DeliveryMethod = "pickup" | "delivery";

export type CreateOrderRequest = {
  clientName: string;
  clientPhone: string;
  clientTelegram?: string;
  startDate: string;
  endDate: string;
  items: { productId: number; quantity: number; pricePerDay: number }[];
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;
  promoCode?: string;
};

export type CreateOrderResult = {
  orderId: number;
  orderNumber: number;
  customerId: number;
  clientName: string;
  /** Нормализованный телефон (7999…). */
  phone: string;
  clientTelegram?: string;
  userId: string;
  dates: string;
  days: number;
  items: {
    productName: string;
    category: string | null;
    quantity: number;
    pricePerDay: string;
    daysCount: number;
    totalPrice: string;
  }[];
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string | null;
  promoCode: string | null;
  total: string;
};

export function inclusiveDayCount(start: Date, end: Date): number {
  const from = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const to = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((to - from) / 86_400_000) + 1;
}

export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function validateOrder(body: CreateOrderRequest): string | null {
  if (!body.clientName.trim()) return "Укажите имя";
  if (!body.clientPhone.trim()) return "Укажите телефон";
  if (!normalizePhone(body.clientPhone)) {
    return "Укажите корректный номер телефона";
  }

  const start = parseDateOnly(body.startDate);
  const end = parseDateOnly(body.endDate);
  if (!start || !end) return "Выберите даты аренды";
  if (inclusiveDayCount(start, end) < 1) {
    return "Дата окончания не может быть раньше даты начала";
  }

  if (body.items.length === 0) return "Корзина пуста";
  if (body.items.some((item) => item.quantity < 1)) {
    return "Количество товара должно быть больше нуля";
  }
  if (body.deliveryMethod === "delivery" && !body.deliveryAddress?.trim()) {
    return "Укажите адрес доставки";
  }

  return null;
}
