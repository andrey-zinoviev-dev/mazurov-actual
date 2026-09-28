import "server-only";

import { randomToken } from "@/lib/auth-crypto";
import {
  clearOtpPending,
  readOtpPending,
  writeOtpPending,
} from "@/lib/otp-pending";
import {
  checkVerification,
  startVerification,
  VerificahubError,
  type VerificahubMethod,
} from "@/lib/verificahub";

/** TTL сессии у Verificahub (max 600). */
export const OTP_TTL_MS = 10 * 60 * 1000;
/** Повтор того же канала (ещё раз Telegram / ещё раз SMS). */
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
/** Через сколько показать «получить по SMS» после старта Telegram. */
export const OTP_SMS_FALLBACK_AFTER_SEC = 20;
export const OTP_MAX_ATTEMPTS = 5;

export type OtpMethod = VerificahubMethod;

export class OtpError extends Error {
  constructor(
    message: string,
    readonly code:
      | "cooldown"
      | "invalid"
      | "expired"
      | "too_many_attempts"
      | "rate_limit"
      | "validation",
    readonly attemptsRemaining?: number,
  ) {
    super(message);
    this.name = "OtpError";
  }
}

function mapStartError(err: VerificahubError): never {
  switch (err.errorCode) {
    case "rate_limit_exceeded":
      throw new OtpError(
        "Слишком много запросов. Подождите немного.",
        "rate_limit",
      );
    case "validation_error":
      throw new OtpError(
        "Проверьте номер телефона и попробуйте снова",
        "validation",
      );
    case "insufficient_balance":
      throw new Error("Сервис подтверждения временно недоступен");
    default:
      throw new Error(err.message || "Не удалось отправить код");
  }
}

function mapCheckError(
  err: VerificahubError,
  attemptsRemaining?: number,
): never {
  switch (err.errorCode) {
    case "invalid_code":
      throw new OtpError(
        "Неверный код",
        "invalid",
        err.attemptsRemaining ?? attemptsRemaining,
      );
    case "not_pending":
      throw new OtpError("Код истёк, запросите новый", "expired");
    case "not_found":
      throw new OtpError("Сначала запросите код", "invalid");
    case "rate_limit_exceeded":
      throw new OtpError(
        "Слишком много попыток. Подождите немного.",
        "rate_limit",
      );
    case "validation_error":
      throw new OtpError("Введите корректный код", "validation");
    default:
      throw new Error(err.message || "Не удалось проверить код");
  }
}

/**
 * Старт верификации. Код создаёт и шлёт только Verificahub.
 * request_id кладём в httpOnly cookie.
 */
export async function requestLoginOtp(
  phone: string,
  method: OtpMethod = "telegram_otp",
): Promise<{
  retryAfterSec: number;
  smsAfterSec: number;
  method: OtpMethod;
}> {
  const existing = await readOtpPending();
  if (existing && existing.phone === phone) {
    const sameChannel = existing.method === method;
    // Cooldown только на повтор того же канала.
    // Смена telegram → sms не ждёт минуту (иначе SMS «под конец» cooldown).
    if (sameChannel) {
      const elapsed = Date.now() - existing.issuedAt;
      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        const retryAfterSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
        throw new OtpError(
          `Повторный код можно запросить через ${retryAfterSec} с.`,
          "cooldown",
        );
      }
    }
  }

  const provider = (process.env.OTP_PROVIDER ?? "verificahub").trim().toLowerCase();
  const expiresAt = Date.now() + OTP_TTL_MS;
  let requestId: string;

  if (provider === "stub") {
    requestId = `stub-${randomToken(12)}`;
    console.info(
      `[otp:stub] method=${method} to=${phone} request_id=${requestId} (код не генерируем — в stub check примите 000000)`,
    );
  } else {
    try {
      const started = await startVerification({
        phone,
        method,
        expirySeconds: Math.floor(OTP_TTL_MS / 1000),
      });
      requestId = started.requestId;
    } catch (err) {
      if (err instanceof VerificahubError) mapStartError(err);
      throw err;
    }
  }

  await writeOtpPending({
    phone,
    requestId,
    method,
    issuedAt: Date.now(),
    expiresAt,
    attempts: 0,
  });

  return {
    retryAfterSec: Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000),
    smsAfterSec: OTP_SMS_FALLBACK_AFTER_SEC,
    method,
  };
}

/** Проверка кода у Verificahub по request_id из cookie. */
export async function verifyLoginOtp(phone: string, code: string): Promise<void> {
  const pending = await readOtpPending();
  if (!pending || pending.phone !== phone) {
    throw new OtpError("Сначала запросите код", "invalid");
  }

  if (pending.expiresAt < Date.now()) {
    await clearOtpPending();
    throw new OtpError("Код истёк, запросите новый", "expired");
  }

  if (pending.attempts >= OTP_MAX_ATTEMPTS) {
    throw new OtpError(
      "Слишком много попыток, запросите новый код",
      "too_many_attempts",
    );
  }

  const trimmed = code.trim();
  const provider = (process.env.OTP_PROVIDER ?? "verificahub").trim().toLowerCase();

  if (provider === "stub" || pending.requestId.startsWith("stub-")) {
    const ok = trimmed === "000000";
    if (!ok) {
      await writeOtpPending({ ...pending, attempts: pending.attempts + 1 });
      throw new OtpError("Неверный код", "invalid", OTP_MAX_ATTEMPTS - pending.attempts - 1);
    }
    await clearOtpPending();
    return;
  }

  try {
    const result = await checkVerification({
      requestId: pending.requestId,
      code: trimmed,
    });

    if (result.status !== "verified") {
      await writeOtpPending({ ...pending, attempts: pending.attempts + 1 });
      throw new OtpError("Неверный код", "invalid");
    }

    await clearOtpPending();
  } catch (err) {
    if (err instanceof OtpError) throw err;

    if (err instanceof VerificahubError) {
      const nextAttempts = pending.attempts + 1;
      await writeOtpPending({ ...pending, attempts: nextAttempts });

      if (nextAttempts >= OTP_MAX_ATTEMPTS) {
        throw new OtpError(
          "Слишком много попыток, запросите новый код",
          "too_many_attempts",
        );
      }

      mapCheckError(err, OTP_MAX_ATTEMPTS - nextAttempts);
    }

    throw err;
  }
}
