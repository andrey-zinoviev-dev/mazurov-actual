import { validateOrder, type CreateOrderRequest } from "@/lib/orders";

export const dynamic = "force-dynamic";

let nextStubOrderId = 1;

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

  return Response.json(
    { success: true, orderId: nextStubOrderId++, stub: true },
    { status: 201 },
  );
}
