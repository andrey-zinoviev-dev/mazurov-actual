import "server-only";

import { normalizePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

/**
 * Привязывает «осиротевшие» заказы к Customer после первого OTP.
 * Совпадение: userId === phone или нормализованный снимок phone.
 */
export async function linkOrphanOrdersToCustomer(
  customerId: number,
  phone: string,
): Promise<number> {
  const orphans = await prisma.order.findMany({
    where: {
      customerId: null,
      OR: [{ userId: phone }, { phone: { not: null } }],
    },
    select: { id: true, userId: true, phone: true },
    take: 1000,
  });

  const ids = orphans
    .filter((order) => {
      if (order.userId === phone) return true;
      return normalizePhone(order.phone ?? "") === phone;
    })
    .map((order) => order.id);

  if (ids.length === 0) return 0;

  const result = await prisma.order.updateMany({
    where: { id: { in: ids }, customerId: null },
    data: { customerId },
  });

  return result.count;
}
