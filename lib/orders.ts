export type DeliveryMethod = "pickup" | "delivery";

export type OrderLineInput = {
  productId: number;
  quantity: number;
  pricePerDay: number;
};

export type CreateOrderInput = {
  clientName: string;
  clientPhone: string;
  startDate: Date;
  endDate: Date;
  items: OrderLineInput[];
  deliveryMethod: DeliveryMethod;
  deliveryAddress?: string;
  promoCode?: string;
};

/** Compact body expected by POST /api/order-preview. */
export type OrderPreviewPayload = {
  v: "2.0";
  preview: true;
  c: { n: string; p: string };
  r: { s: string; e: string; d: number };
  i: { i: number; q: number; pr: number }[];
  subtotal: number;
  total: number;
  delivery: {
    method: DeliveryMethod;
    address: string | null;
  };
  promo?: { code: string };
};

type OrderPreviewResponse = {
  success?: boolean;
  orderId?: number;
  error?: string;
};

export function inclusiveDayCount(start: Date, end: Date): number {
  const from = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const to = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((to - from) / 86_400_000) + 1;
}

export function buildOrderPreviewPayload(
  input: CreateOrderInput,
): OrderPreviewPayload {
  const days = inclusiveDayCount(input.startDate, input.endDate);
  const subtotal = input.items.reduce(
    (sum, item) => sum + item.pricePerDay * item.quantity * days,
    0,
  );

  const payload: OrderPreviewPayload = {
    v: "2.0",
    preview: true,
    c: { n: input.clientName.trim(), p: input.clientPhone.trim() },
    r: {
      s: input.startDate.toISOString(),
      e: input.endDate.toISOString(),
      d: days,
    },
    i: input.items.map((item) => ({
      i: item.productId,
      q: item.quantity,
      pr: item.pricePerDay,
    })),
    subtotal,
    total: subtotal,
    delivery: {
      method: input.deliveryMethod,
      address:
        input.deliveryMethod === "delivery"
          ? input.deliveryAddress?.trim() || null
          : null,
    },
  };

  const promo = input.promoCode?.trim();
  if (promo) {
    payload.promo = { code: promo.toUpperCase() };
  }

  return payload;
}

export function validateOrderInput(input: CreateOrderInput): string | null {
  if (!input.clientName.trim()) return "Укажите имя";
  if (!input.clientPhone.trim()) return "Укажите телефон";
  if (Number.isNaN(input.startDate.getTime()) || Number.isNaN(input.endDate.getTime())) {
    return "Выберите даты аренды";
  }
  if (inclusiveDayCount(input.startDate, input.endDate) < 1) {
    return "Дата окончания не может быть раньше даты начала";
  }
  if (input.items.length === 0) return "Корзина пуста";
  if (input.items.some((item) => item.quantity < 1)) {
    return "Количество товара должно быть больше нуля";
  }
  if (input.deliveryMethod === "delivery" && !input.deliveryAddress?.trim()) {
    return "Укажите адрес доставки";
  }
  return null;
}

export async function createOrderPreview(
  input: CreateOrderInput,
): Promise<{ orderId: number; payload: OrderPreviewPayload }> {
  const validationError = validateOrderInput(input);
  if (validationError) {
    throw new Error(validationError);
  }

  const payload = buildOrderPreviewPayload(input);
  const response = await fetch("/api/order-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let data: OrderPreviewResponse;
  try {
    data = JSON.parse(raw) as OrderPreviewResponse;
  } catch {
    throw new Error(
      `Сервер вернул не JSON (HTTP ${response.status}). Проверьте /api/order-preview.`,
    );
  }

  if (!response.ok || !data.success || data.orderId == null) {
    throw new Error(data.error || `Не удалось создать заказ (HTTP ${response.status})`);
  }

  console.log("Заказ успешно создан", {
    orderId: data.orderId,
    total: payload.total,
    days: payload.r.d,
    items: payload.i.length,
  });

  return { orderId: data.orderId, payload };
}
