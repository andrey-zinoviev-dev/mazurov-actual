import { searchProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  try {
    const products = await searchProducts(q);
    return Response.json({ products });
  } catch (err) {
    console.error("searchProducts failed", err);
    return Response.json(
      { products: [], error: "Не удалось выполнить поиск" },
      { status: 500 },
    );
  }
}
