import "server-only";

/**
 * Egress к Telegram через Cloudflare Worker (если задан TELEGRAM_PROXY_URL),
 * иначе напрямую — удобно для локальной разработки вне блокировки.
 */
export function telegramBotApiUrl(token: string, method: string): string {
  const proxy = process.env.TELEGRAM_PROXY_URL?.trim().replace(/\/$/, "");
  const path = `bot${token}/${method}`;
  if (proxy) return `${proxy}/${path}`;
  return `https://api.telegram.org/${path}`;
}

export function telegramGatewayUrl(method: string): string {
  const proxy = process.env.TELEGRAM_PROXY_URL?.trim().replace(/\/$/, "");
  if (proxy) return `${proxy}/gateway/${method}`;
  return `https://gatewayapi.telegram.org/${method}`;
}

/** Заголовки для запросов через прокси (+ опциональный Authorization). */
export function telegramFetchHeaders(
  extra?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...extra,
  };
  const secret = process.env.TELEGRAM_PROXY_SECRET?.trim();
  if (secret) {
    headers["X-Proxy-Secret"] = secret;
  }
  return headers;
}
