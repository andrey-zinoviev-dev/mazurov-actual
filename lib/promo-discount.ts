/** Нормализация кода: trim + UPPER (как в админке). */
export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type PromoDiscountKind = "percent" | "fixed";

/** Сумма скидки от subtotal по типу и значению из `promo_codes`. */
export function computePromoDiscountAmount(
  subtotal: number,
  discountType: PromoDiscountKind | null | undefined,
  discountValue: number,
): number {
  const base = Math.max(0, subtotal);
  const value = Number(discountValue);
  if (!Number.isFinite(value) || value <= 0 || base <= 0) return 0;

  if (discountType === "fixed") {
    return roundMoney(Math.min(value, base));
  }

  // percent (default)
  return roundMoney((base * Math.min(value, 100)) / 100);
}
