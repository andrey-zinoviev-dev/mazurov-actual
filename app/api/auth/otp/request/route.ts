import { findOrCreateCustomer } from "@/lib/customers";
import { normalizePhone } from "@/lib/phone";
import { OtpError, requestLoginOtp } from "@/lib/otp";

export const dynamic = "force-dynamic";

type Body = { phone?: string };

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
  if (!phone) {
    return Response.json(
      { success: false, error: "Укажите корректный номер телефона" },
      { status: 400 },
    );
  }

  try {
    // Аккаунт может появиться до первой заявки (только вход).
    await findOrCreateCustomer(phone);
    const { retryAfterSec } = await requestLoginOtp(phone);
    return Response.json({ success: true, retryAfterSec });
  } catch (err) {
    if (err instanceof OtpError) {
      const status = err.code === "rate_limit" ? 429 : 400;
      return Response.json(
        { success: false, error: err.message, code: err.code },
        { status },
      );
    }
    console.error("otp request failed", err);
    return Response.json(
      { success: false, error: "Не удалось отправить код" },
      { status: 500 },
    );
  }
}
