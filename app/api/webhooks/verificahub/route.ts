import { verifyWebhookSignature } from "@/lib/verificahub";

export const dynamic = "force-dynamic";

/**
 * Verificahub webhook: смена статуса сессии.
 * Подпись X-Verificahub-Signature; идемпотентный 2xx.
 * Локальный OTP state не в БД — здесь только приём и ack.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-verificahub-signature");

  try {
    if (!verifyWebhookSignature(rawBody, signature)) {
      return Response.json({ error: "invalid signature" }, { status: 401 });
    }
  } catch (err) {
    console.error("verificahub webhook auth failed", err);
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = JSON.parse(rawBody) as {
      event?: string;
      request_id?: string;
      status?: string;
      method?: string;
    };
    console.info(
      "[verificahub:webhook]",
      body.event,
      body.request_id,
      body.status,
      body.method,
    );
  } catch {
    // всё равно 2xx — иначе ретраи на битом JSON
  }

  return Response.json({ ok: true });
}
