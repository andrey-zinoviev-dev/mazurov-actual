import { destroyCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await destroyCurrentSession();
    return Response.json({ success: true });
  } catch (err) {
    console.error("logout failed", err);
    return Response.json(
      { success: false, error: "Не удалось выйти" },
      { status: 500 },
    );
  }
}
