import { normalizePhone } from "@/lib/phone";
import { evaluatePromo } from "@/lib/promo";

export const dynamic = "force-dynamic";

type Body = {
  code?: string;
  /** Сырой телефон — для лимитов / first_only. */
  phone?: string;
  subtotal?: number;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json(
      { ok: false, error: "Тело запроса должно быть JSON" },
      { status: 400 },
    );
  }

  const code = typeof body.code === "string" ? body.code : "";
  const subtotal = Number(body.subtotal);
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    return Response.json(
      { ok: false, error: "Некорректная сумма заказа" },
      { status: 400 },
    );
  }

  const phone = normalizePhone(body.phone ?? "");

  const result = await evaluatePromo({
    code,
    subtotal,
    phone: phone || null,
    userId: phone || null,
    requireUserContext: false,
  });

  if (!result.ok) {
    return Response.json(result, { status: 200 });
  }

  return Response.json({
    ok: true,
    code: result.code,
    discountType: result.discountType,
    discountValue: result.discountValue,
    discountAmount: result.discountAmount,
    discountPercent: result.discountPercent,
    total: result.total,
  });
}
