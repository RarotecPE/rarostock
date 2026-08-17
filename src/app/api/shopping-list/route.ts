import { NextRequest, NextResponse } from "next/server";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canExport } from "@/lib/roles";
import {
  formatShoppingListFilters,
  getShoppingListFilename,
  listShoppingItems,
  renderShoppingListPdf,
} from "@/lib/shopping-list";

export const runtime = "nodejs";

function parseProductIds(url: URL) {
  return url.searchParams
    .getAll("productId")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, canExport);
  if (hasAuthError(auth)) return auth.response;

  const url = new URL(req.url);
  const categoryFilters = url.searchParams.getAll("category");
  const statusFilters = url.searchParams.getAll("status");
  const search = url.searchParams.get("search");
  const productIds = parseProductIds(url);

  try {
    const shoppingItems = await listShoppingItems({
      search,
      categories: categoryFilters,
      statuses: statusFilters,
      productIds,
    });
    const pdf = await renderShoppingListPdf(shoppingItems, formatShoppingListFilters(search, categoryFilters, statusFilters));

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${getShoppingListFilename()}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to generate shopping list PDF", error);
    return NextResponse.json({ error: "Não foi possível gerar a lista de compras." }, { status: 500 });
  }
}
