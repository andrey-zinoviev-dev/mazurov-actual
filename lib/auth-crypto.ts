import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

function authSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") {
    return "dev-only-auth-secret-change-me";
  }
  throw new Error("AUTH_SECRET is not set");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Хэш OTP/токена с серверным секретом (не храним plaintext). */
export function hashSecretValue(value: string): string {
  return sha256Hex(`${authSecret()}:${value}`);
}

export function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "hex");
    const bufB = Buffer.from(b, "hex");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/** 6-значный числовой код. */
export function generateOtpCode(): string {
  const n = randomBytes(3).readUIntBE(0, 3) % 1_000_000;
  return n.toString().padStart(6, "0");
}
