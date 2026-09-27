import { findOrCreateCustomer } from "@/lib/customers";
import { OtpError, requestLoginOtp, type OtpMethod } from "@/lib/otp";
import { normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

type Body = {
  phone?: string;
  /** telegram_otp (default) | sms */
  method?: string;
};

function parseMethod(value: string | undefined): OtpMethod {
  return value === "sms" ? "sms" : "telegram_otp";
}

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
  if (!phone) {
    return Response.json(
      { success: false, error: "Укажите корректный номер телефона" },
      { status: 400 },
    );
  }

  const method = parseMethod(body.method);

  try {
    await findOrCreateCustomer(phone);
    const result = await requestLoginOtp(phone, method);
    return Response.json({
      success: true,
      retryAfterSec: result.retryAfterSec,
      smsAfterSec: result.smsAfterSec,
      method: result.method,
    });
  } catch (err) {
    if (err instanceof OtpError) {
      return Response.json(
        { success: false, error: err.message, code: err.code },
        { status: statusForOtpError(err.code) },
      );
    }
    console.error("otp request failed", err);
    return Response.json(
      { success: false, error: "Не удалось отправить код" },
      { status: 500 },
    );
  }
}
