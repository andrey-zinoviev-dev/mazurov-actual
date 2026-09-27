import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { toE164 } from "@/lib/phone";

const BASE_URL = "https://api.verificahub.ru/v1";

export type VerificahubMethod = "telegram_otp" | "sms";

export class VerificahubError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly errorCode?: string,
    readonly attemptsRemaining?: number,
  ) {
    super(message);
    this.name = "VerificahubError";
  }
}

type ProblemBody = {
  detail?: string;
  title?: string;
  error_code?: string;
  attempts_remaining?: number;
};

function credentials(): { key: string; secret: string } {
  const key = process.env.VERIFICAHUB_API_KEY?.trim();
  const secret = process.env.VERIFICAHUB_API_SECRET?.trim();
  if (!key || !secret) {
    throw new Error("VERIFICAHUB_API_KEY / VERIFICAHUB_API_SECRET are not set");
  }
  return { key, secret };
}

function basicAuthHeader(): string {
  const { key, secret } = credentials();
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

async function vhFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: basicAuthHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const raw = await response.text();
  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw) as unknown;
    } catch {
      throw new VerificahubError(
        `Verificahub ${response.status}: ${raw}`,
        response.status,
      );
    }
  }

  if (!response.ok) {
    const problem = (data ?? {}) as ProblemBody;
    throw new VerificahubError(
      problem.detail || problem.title || `Verificahub ${response.status}`,
      response.status,
      problem.error_code,
      problem.attempts_remaining,
    );
  }

  return data as T;
}

/** Код генерирует и доставляет Verificahub — мы только стартуем сессию. */
export async function startVerification(params: {
  phone: string;
  method: VerificahubMethod;
  expirySeconds?: number;
}): Promise<{ requestId: string; status: string }> {
  const phoneNumber = toE164(params.phone);
  if (!phoneNumber) {
    throw new VerificahubError("Invalid phone number", 400, "validation_error");
  }

  const expiry =
    params.expirySeconds == null
      ? undefined
      : Math.min(600, Math.max(30, Math.floor(params.expirySeconds)));

  const data = await vhFetch<{
    request_id: string;
    status: string;
  }>("/verify", {
    method: "POST",
    body: JSON.stringify({
      phone_number: phoneNumber,
      method: params.method,
      ...(expiry != null ? { expiry_seconds: expiry } : {}),
    }),
  });

  if (!data.request_id) {
    throw new VerificahubError("Verificahub response missing request_id", 502);
  }

  return { requestId: data.request_id, status: data.status };
}

/** Пользователь ввёл код → проверяем у Verificahub. */
export async function checkVerification(params: {
  requestId: string;
  code: string;
}): Promise<{ requestId: string; status: string }> {
  const data = await vhFetch<{
    request_id: string;
    status: string;
  }>("/verify/check", {
    method: "POST",
    body: JSON.stringify({
      request_id: params.requestId,
      code: params.code,
    }),
  });

  return { requestId: data.request_id, status: data.status };
}

/** `X-Verificahub-Signature: sha256=<hex HMAC-SHA256(api_secret, raw_body)>` */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader) return false;

  const expectedHex = createHmac("sha256", credentials().secret)
    .update(rawBody, "utf8")
    .digest("hex");

  const match = /^sha256=([a-fA-F0-9]+)$/.exec(signatureHeader.trim());
  if (!match) return false;

  const got = match[1].toLowerCase();
  const want = expectedHex.toLowerCase();
  if (got.length !== want.length) return false;

  try {
    return timingSafeEqual(Buffer.from(got, "utf8"), Buffer.from(want, "utf8"));
  } catch {
    return false;
  }
}
