import "server-only";

import {
  computePromoDiscountAmount,
  normalizePromoCode,
  roundMoney,
  type PromoDiscountKind,
} from "@/lib/promo-discount";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/client";

export class PromoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromoError";
  }
}

export type PromoEvalOk = {
  ok: true;
  code: string;
  discountType: PromoDiscountKind;
  discountValue: number;
  discountAmount: number;
  /** Для percent — процент; для fixed — null (в заказе пишем amount). */
  discountPercent: number | null;
  total: number;
};

export type PromoEvalFail = {
  ok: false;
  error: string;
};

export type PromoEvalResult = PromoEvalOk | PromoEvalFail;

type PromoTx = Pick<
  typeof prisma,
  "promoCode" | "promoUsageHistory" | "usedPromocode" | "order" | "customer"
>;

type EvaluatePromoInput = {
  code: string;
  subtotal: number;
  /** Нормализованный телефон (7999…) — для лимитов на пользователя и first_only. */
  phone?: string | null;
  /** Legacy user_id заказа (telegram или phone) — как в боте. */
  userId?: string | null;
  /** true = списывать нельзя «мягко» пропустить user-правила без phone. */
  requireUserContext?: boolean;
};

function endOfExpiryDay(expiryDate: Date): Date {
  const end = new Date(expiryDate);
  end.setHours(23, 59, 59, 999);
  return end;
}

function userKeys(phone?: string | null, userId?: string | null): string[] {
  const keys = new Set<string>();
  if (phone) keys.add(phone.slice(0, 50));
  if (userId) keys.add(userId.slice(0, 50));
  return [...keys];
}

async function countUserPromoUses(
  db: PromoTx,
  code: string,
  keys: string[],
): Promise<number> {
  if (keys.length === 0) return 0;

  const [history, used] = await Promise.all([
    db.promoUsageHistory.count({
      where: { promoCode: code, userId: { in: keys } },
    }),
    db.usedPromocode.count({
      where: { promoCode: code, userId: { in: keys } },
    }),
  ]);

  return Math.max(history, used);
}

async function hasPriorOrders(
  db: PromoTx,
  phone?: string | null,
  userId?: string | null,
): Promise<boolean> {
  const or: Prisma.OrderWhereInput[] = [];
  if (phone) {
    const customer = await db.customer.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (customer) {
      or.push({ customerId: customer.id });
    }
    or.push({ phone: { contains: phone.slice(-10) } });
  }
  if (userId) {
    or.push({ userId });
  }
  if (or.length === 0) return false;

  const existing = await db.order.findFirst({
    where: { OR: or },
    select: { id: true },
  });
  return existing != null;
}

/**
 * Проверка правил `promo_codes` без списания.
 * Вызывать и из validate API, и из createOrder (во втором — с user-контекстом).
 */
export async function evaluatePromo(
  input: EvaluatePromoInput,
  db: PromoTx = prisma,
): Promise<PromoEvalResult> {
  const code = normalizePromoCode(input.code);
  if (!code) {
    return { ok: false, error: "Введите промокод" };
  }

  const promo = await db.promoCode.findUnique({ where: { code } });
  if (!promo) {
    return { ok: false, error: "Промокод не найден" };
  }

  if (promo.isActive === false) {
    return { ok: false, error: "Промокод неактивен" };
  }

  if (promo.expiryDate && endOfExpiryDay(promo.expiryDate).getTime() < Date.now()) {
    return { ok: false, error: "Срок действия промокода истёк" };
  }

  const discountValue = Number(promo.discountValue);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    return { ok: false, error: "Промокод настроен некорректно" };
  }

  const maxUses = promo.maxUses ?? 0;
  const timesUsed = promo.timesUsed ?? 0;
  if (maxUses > 0 && timesUsed >= maxUses) {
    return { ok: false, error: "Промокод больше недоступен" };
  }

  const usageType = promo.usageType ?? "one_time";
  const orderLimit = promo.orderLimit ?? "first_only";
  const maxUsesPerUser = promo.maxUsesPerUser ?? 0;
  const keys = userKeys(input.phone, input.userId);
  const needsUser =
    usageType === "one_time" ||
    orderLimit === "first_only" ||
    maxUsesPerUser > 0;

  if (needsUser && keys.length === 0) {
    if (input.requireUserContext) {
      return { ok: false, error: "Укажите телефон, чтобы применить промокод" };
    }
    // Превью в корзине без телефона: показываем скидку, user-правила — при оформлении.
  } else if (keys.length > 0) {
    const userUses = await countUserPromoUses(db, code, keys);

    if (usageType === "one_time" && userUses > 0) {
      return { ok: false, error: "Вы уже использовали этот промокод" };
    }

    if (maxUsesPerUser > 0 && userUses >= maxUsesPerUser) {
      return {
        ok: false,
        error: "Достигнут лимит использований промокода для вашего номера",
      };
    }

    if (orderLimit === "first_only") {
      const prior = await hasPriorOrders(db, input.phone, input.userId);
      if (prior) {
        return {
          ok: false,
          error: "Промокод действует только на первый заказ",
        };
      }
    }
  }

  const discountType: PromoDiscountKind =
    promo.discountType === "fixed" ? "fixed" : "percent";
  const discountAmount = computePromoDiscountAmount(
    input.subtotal,
    discountType,
    discountValue,
  );
  const total = roundMoney(Math.max(0, input.subtotal - discountAmount));

  return {
    ok: true,
    code,
    discountType,
    discountValue,
    discountAmount,
    discountPercent: discountType === "percent" ? Math.round(discountValue) : null,
    total,
  };
}

/** Списание использования внутри транзакции создания заказа. */
export async function recordPromoUsage(
  tx: PromoTx,
  params: {
    code: string;
    userId: string;
    orderId: bigint;
  },
): Promise<void> {
  await tx.promoCode.update({
    where: { code: params.code },
    data: { timesUsed: { increment: 1 } },
  });

  await tx.promoUsageHistory.create({
    data: {
      promoCode: params.code,
      userId: params.userId.slice(0, 50),
      orderId: params.orderId,
    },
  });

  await tx.usedPromocode.create({
    data: {
      promoCode: params.code,
      userId: params.userId.slice(0, 50),
    },
  });
}
