/**
 * Нормализация телефона для идентичности Customer / OTP.
 * РФ: 8999… / +7 999… / 999… → `79991234567`.
 * Возвращает null, если номер не похож на валидный российский мобильный/городской (11 цифр, начинается с 7).
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;

  let normalized = digits;

  if (normalized.length === 11 && normalized.startsWith("8")) {
    normalized = `7${normalized.slice(1)}`;
  } else if (normalized.length === 10) {
    normalized = `7${normalized}`;
  }

  if (normalized.length !== 11 || !normalized.startsWith("7")) {
    return null;
  }

  return normalized;
}

/** E.164 для Telegram Gateway: `+79991234567`. */
export function toE164(normalizedOrRaw: string): string | null {
  const normalized = normalizePhone(normalizedOrRaw);
  if (!normalized) return null;
  return `+${normalized}`;
}

/** Для UI: `+7 999 123-45-67`. */
export function formatPhoneDisplay(normalized: string): string {
  if (normalized.length !== 11 || !normalized.startsWith("7")) {
    return normalized;
  }

  const a = normalized.slice(1, 4);
  const b = normalized.slice(4, 7);
  const c = normalized.slice(7, 9);
  const d = normalized.slice(9, 11);
  return `+7 ${a} ${b}-${c}-${d}`;
}
