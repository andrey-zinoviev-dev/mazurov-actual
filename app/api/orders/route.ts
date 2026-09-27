import { createOrder } from "@/lib/create-order";
import { validateOrder, type CreateOrderRequest } from "@/lib/orders";
import { PromoError } from "@/lib/promo";
import { notifyNewOrder } from "@/lib/telegram-notify";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: CreateOrderRequest;
  try {
    body = (await request.json()) as CreateOrderRequest;
  } catch {
    return Response.json(
      { success: false, error: "Тело запроса должно быть JSON" },
      { status: 400 },
    );
  }

  const error = validateOrder(body);
  if (error) {
    return Response.json({ success: false, error }, { status: 400 });
  }

  try {
    const order = await createOrder(body);
    await notifyNewOrder(order);
    return Response.json(
      { success: true, orderId: order.orderNumber },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof PromoError) {
      return Response.json({ success: false, error: err.message }, { status: 400 });
    }
    const message =
      err instanceof Error ? err.message : "Не удалось создать заказ";
    console.error("createOrder failed", err);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
