import "server-only";

import type { PrismaClient } from "@/generated/client";
import { prisma } from "@/lib/prisma";

type CustomerDb = Pick<PrismaClient, "customer">;

export type CustomerRecord = {
  id: number;
  phone: string;
  name: string | null;
};

/**
 * Находит или создаёт Customer по уже нормализованному телефону.
 * Имя обновляем только если передали непустую строку (чекаут);
 * при логине по OTP имя можно не трогать.
 */
export async function findOrCreateCustomer(
  phone: string,
  name?: string | null,
  db: CustomerDb = prisma,
): Promise<CustomerRecord> {
  const trimmed = name?.trim().slice(0, 255) || null;

  const customer = await db.customer.upsert({
    where: { phone },
    create: {
      phone,
      name: trimmed,
    },
    update: trimmed ? { name: trimmed } : {},
    select: { id: true, phone: true, name: true },
  });

  return customer;
}
