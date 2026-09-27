import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import type { VerificahubMethod } from "@/lib/verificahub";

export const OTP_PENDING_COOKIE = "mazurov_otp";

export type OtpPending = {
  phone: string;
  requestId: string;
  method: VerificahubMethod;
  /** unix ms */
  issuedAt: number;
  /** unix ms */
  expiresAt: number;
  attempts: number;
};

function signingSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") {
    return "dev-only-auth-secret-change-me";
  }
  throw new Error("AUTH_SECRET is not set");
}

function sign(payloadB64: string): string {
  return createHmac("sha256", signingSecret())
    .update(payloadB64)
    .digest("base64url");
}

function encode(pending: OtpPending): string {
  const payloadB64 = Buffer.from(JSON.stringify(pending), "utf8").toString(
    "base64url",
  );
  return `${payloadB64}.${sign(payloadB64)}`;
}

function decode(token: string): OtpPending | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const want = sign(payloadB64);
  try {
    if (
      sig.length !== want.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(want))
    ) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    ) as OtpPending;
    if (
      typeof parsed.phone !== "string" ||
      typeof parsed.requestId !== "string" ||
      typeof parsed.method !== "string" ||
      typeof parsed.issuedAt !== "number" ||
      typeof parsed.expiresAt !== "number" ||
      typeof parsed.attempts !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function readOtpPending(): Promise<OtpPending | null> {
  const jar = await cookies();
  const raw = jar.get(OTP_PENDING_COOKIE)?.value;
  if (!raw) return null;
  return decode(raw);
}

export async function writeOtpPending(pending: OtpPending): Promise<void> {
  const jar = await cookies();
  jar.set(OTP_PENDING_COOKIE, encode(pending), {
    ...cookieOptions,
    expires: new Date(pending.expiresAt),
  });
}

export async function clearOtpPending(): Promise<void> {
  const jar = await cookies();
  jar.delete(OTP_PENDING_COOKIE);
}
