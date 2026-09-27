import "server-only";

import { toE164 } from "@/lib/phone";
import {
  telegramFetchHeaders,
  telegramGatewayUrl,
} from "@/lib/telegram-proxy";

export type SendOtpResult = {
  provider: "stub" | "telegram_gateway";
  messageId?: string;
};

/**
 * Доставка OTP-кода.
 * OTP_PROVIDER=stub | telegram_gateway
 *
 * Gateway: свой код через sendVerificationMessage (E.164 + Bearer token),
 * при TELEGRAM_PROXY_URL — через Cloudflare Worker.
 */
export async function sendLoginOtp(params: {
  /** Нормализованный телефон без +, например 79991234567 */
  phone: string;
  code: string;
  /** TTL сообщения в Gateway, секунды (30…3600). */
  ttlSec?: number;
}): Promise<SendOtpResult> {
  const provider = (process.env.OTP_PROVIDER ?? "stub").trim().toLowerCase();

  if (provider === "stub") {
    console.info(`[otp:stub] to=${params.phone} code=${params.code}`);
    return { provider: "stub", messageId: `stub-${Date.now()}` };
  }

  if (provider === "telegram_gateway") {
    return sendViaTelegramGateway(params);
  }

  throw new Error(`Неизвестный OTP_PROVIDER: ${provider}`);
}

async function sendViaTelegramGateway(params: {
  phone: string;
  code: string;
  ttlSec?: number;
}): Promise<SendOtpResult> {
  const token = process.env.TELEGRAM_GATEWAY_TOKEN?.trim();
  if (!token) {
    throw new Error("TELEGRAM_GATEWAY_TOKEN is not set");
  }

  const phoneNumber = toE164(params.phone);
  if (!phoneNumber) {
    throw new Error("Invalid phone for Telegram Gateway");
  }

  const ttl = Math.min(3600, Math.max(30, params.ttlSec ?? 600));

  const response = await fetch(telegramGatewayUrl("sendVerificationMessage"), {
    method: "POST",
    headers: telegramFetchHeaders({
      Authorization: `Bearer ${token}`,
    }),
    body: JSON.stringify({
      phone_number: phoneNumber,
      code: params.code,
      ttl,
    }),
  });

  const raw = await response.text();
  let data: { ok?: boolean; error?: string; result?: { request_id?: string } };
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    throw new Error(`Telegram Gateway ${response.status}: ${raw}`);
  }

  if (!response.ok || data.ok === false) {
    throw new Error(
      `Telegram Gateway: ${data.error || raw || response.status}`,
    );
  }

  return {
    provider: "telegram_gateway",
    messageId: data.result?.request_id,
  };
}
