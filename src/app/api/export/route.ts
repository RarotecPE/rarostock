import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canExport } from "@/lib/roles";
import { getStockStatus, formatLimit } from "@/types/stock";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, canExport);
  if (hasAuthError(auth)) return auth.response;

  const url = new URL(req.url);
  const categoryFilters = url.searchParams.getAll("category");
  const statusFilters = url.searchParams.getAll("status");
  const search = url.searchParams.get("search");
  let allProducts = await db.select().from(products);

  if (categoryFilters.length) allProducts = allProducts.filter((i) => categoryFilters.includes(i.category));
  if (search) {
    const norm = search.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    allProducts = allProducts.filter((i) => i.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(norm) || i.code.toLowerCase().includes(norm));
  }
  if (statusFilters.length) allProducts = allProducts.filter((i) => statusFilters.includes(getStockStatus(i.quantity, i.minimumLimit, i.desiredLimit)));

  const headers = ["Código", "Nome", "Categoria", "Unidade", "Unidade Adicional", "Quantidade", "Limite Mínimo", "Limite Desejável", "Status", "Marca", "Observações"];
  const rows = allProducts.map((i) => [
    i.code,
    `"${i.name}"`,
    `"${i.category}"`,
    i.unit,
    `"${i.additionalUnit || ""}"`,
    String(i.quantity),
    formatLimit(i.minimumLimit),
    formatLimit(i.desiredLimit),
    getStockStatus(i.quantity, i.minimumLimit, i.desiredLimit),
    `"${i.brand || ""}"`,
    `"${(i.observations || "").replace(/"/g, '""')}"`,
  ].join(";"));

  const csv = "\uFEFF" + headers.join(";") + "\n" + rows.join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="rarostock_produtos.csv"' } });
}
