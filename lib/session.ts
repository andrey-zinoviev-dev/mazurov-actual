import "server-only";

import { cookies } from "next/headers";
import { hashSecretValue, randomToken } from "@/lib/auth-crypto";
import type { CustomerRecord } from "@/lib/customers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "mazurov_session";
/** ~1 год — для небольшого кабинета почти «навсегда», но не immortal. */
export const SESSION_TTL_MS = 365 * 24 * 60 * 60 * 1000;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function createCustomerSession(customerId: number): Promise<void> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.customerSession.create({
    data: {
      customerId,
      tokenHash: hashSecretValue(token),
      expiresAt,
    },
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    ...cookieOptions,
    expires: expiresAt,
  });
}

export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  jar.delete(SESSION_COOKIE);

  if (!token) return;

  await prisma.customerSession.deleteMany({
    where: { tokenHash: hashSecretValue(token) },
  });
}

export async function getSessionCustomer(): Promise<CustomerRecord | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.customerSession.findUnique({
    where: { tokenHash: hashSecretValue(token) },
    select: {
      id: true,
      expiresAt: true,
      customer: { select: { id: true, phone: true, name: true } },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.customerSession.delete({ where: { id: session.id } });
    // Не трогаем cookies() здесь: getSessionCustomer вызывается из RSC (layout).
    return null;
  }

  // Продлеваем срок в БД. Cookie живёт до исходного expires с логина (~год);
  // полный sliding cookie — из Route Handler при желании позже.
  await prisma.customerSession.update({
    where: { id: session.id },
    data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });

  return session.customer;
}
