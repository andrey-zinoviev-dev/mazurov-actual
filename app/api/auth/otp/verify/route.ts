import { findOrCreateCustomer } from "@/lib/customers";
import { linkOrphanOrdersToCustomer } from "@/lib/link-orders";
import { OtpError, verifyLoginOtp } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";
import { createCustomerSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Body = { phone?: string; code?: string };

function statusForOtpError(code: OtpError["code"]): number {
  return code === "rate_limit" ? 429 : 400;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json(
      { success: false, error: "Тело запроса должно быть JSON" },
      { status: 400 },
    );
  }

  const phone = normalizePhone(body.phone ?? "");
  const code = body.code?.trim() ?? "";
  if (!phone) {
    return Response.json(
      { success: false, error: "Укажите корректный номер телефона" },
      { status: 400 },
    );
  }
  if (!/^\d{4,8}$/.test(code)) {
    return Response.json(
      { success: false, error: "Введите код из сообщения" },
      { status: 400 },
    );
  }

  try {
    await verifyLoginOtp(phone, code);
    const customer = await findOrCreateCustomer(phone);
    await linkOrphanOrdersToCustomer(customer.id, phone);
    await createCustomerSession(customer.id);

    return Response.json({
      success: true,
      customer: { id: customer.id, phone: customer.phone, name: customer.name },
    });
  } catch (err) {
    if (err instanceof OtpError) {
      return Response.json(
        {
          success: false,
          error: err.message,
          code: err.code,
          ...(err.attemptsRemaining != null
            ? { attemptsRemaining: err.attemptsRemaining }
            : {}),
        },
        { status: statusForOtpError(err.code) },
      );
    }
    console.error("otp verify failed", err);
    return Response.json(
      { success: false, error: "Не удалось войти" },
      { status: 500 },
    );
  }
}
