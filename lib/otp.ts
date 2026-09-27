import "server-only";

import { generateOtpCode, hashSecretValue, safeEqualHex } from "@/lib/auth-crypto";
import { sendLoginOtp } from "@/lib/otp-delivery";
import { prisma } from "@/lib/prisma";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_PER_PHONE_HOUR = 5;

export class OtpError extends Error {
  constructor(
    message: string,
    readonly code:
      | "cooldown"
      | "rate_limit"
      | "invalid"
      | "expired"
      | "too_many_attempts",
  ) {
    super(message);
    this.name = "OtpError";
  }
}

export async function requestLoginOtp(phone: string): Promise<{ retryAfterSec: number }> {
  const sinceHour = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await prisma.otpChallenge.count({
    where: { phone, createdAt: { gte: sinceHour } },
  });
  if (recentCount >= OTP_MAX_PER_PHONE_HOUR) {
    throw new OtpError("Слишком много запросов кода. Попробуйте позже.", "rate_limit");
  }

  const latest = await prisma.otpChallenge.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (latest) {
    const elapsed = Date.now() - latest.createdAt.getTime();
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      const retryAfterSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
      throw new OtpError(
        `Повторный код можно запросить через ${retryAfterSec} с.`,
        "cooldown",
      );
    }
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.otpChallenge.create({
    data: {
      phone,
      codeHash: hashSecretValue(code),
      expiresAt,
    },
  });

  await sendLoginOtp({
    phone,
    code,
    ttlSec: Math.floor(OTP_TTL_MS / 1000),
  });

  return { retryAfterSec: Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000) };
}

export async function verifyLoginOtp(phone: string, code: string): Promise<void> {
  const challenge = await prisma.otpChallenge.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    throw new OtpError("Сначала запросите код", "invalid");
  }

  if (challenge.expiresAt.getTime() < Date.now()) {
    throw new OtpError("Код истёк, запросите новый", "expired");
  }

  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    throw new OtpError("Слишком много попыток, запросите новый код", "too_many_attempts");
  }

  const ok = safeEqualHex(challenge.codeHash, hashSecretValue(code.trim()));
  if (!ok) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    throw new OtpError("Неверный код", "invalid");
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });
}
