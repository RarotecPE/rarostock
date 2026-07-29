import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { items } from "@/db/schema";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canExport } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, canExport);
  if (hasAuthError(auth)) return auth.response;

  const url = new URL(req.url);
  const typeFilter = url.searchParams.get("type");
  const categoryFilter = url.searchParams.get("category");
  const statusFilter = url.searchParams.get("status");
  const search = url.searchParams.get("search");

  let allItems = await db.select().from(items);

  // Apply filters
  if (typeFilter) {
    allItems = allItems.filter((i) => i.type === typeFilter);
  }
  if (categoryFilter) {
    allItems = allItems.filter((i) => i.category === categoryFilter);
  }
  if (search) {
    const norm = search
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    allItems = allItems.filter((i) => {
      const nameNorm = i.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      const codeNorm = i.code.toLowerCase();
      return nameNorm.includes(norm) || codeNorm.includes(norm);
    });
  }
  if (statusFilter) {
    allItems = allItems.filter((i) => {
      const st =
        i.quantity === 0
          ? "Indisponível"
          : i.minimumLimit !== null && i.quantity < i.minimumLimit
            ? "Abaixo do Mínimo"
            : "Em Estoque";
      return st === statusFilter;
    });
  }

  // Build CSV with BOM
  const BOM = "\uFEFF";
  const headers = [
    "Código",
    "Nome",
    "Categoria",
    "Tipo",
    "Unidade",
    "Unidade Adicional",
    "Quantidade",
    "Limite Mínimo",
    "Status",
    "Marca",
    "Observações",
  ];
  const rows = allItems.map((i) => {
    const status =
      i.quantity === 0
        ? "Indisponível"
        : i.minimumLimit !== null && i.quantity < i.minimumLimit
          ? "Abaixo do Mínimo"
          : "Em Estoque";
    return [
      i.code,
      `"${i.name}"`,
      `"${i.category}"`,
      i.type,
      i.unit,
      `"${i.additionalUnit || ""}"`,
      String(i.quantity),
      i.minimumLimit === null ? "—" : String(i.minimumLimit),
      status,
      `"${i.brand || ""}"`,
      `"${(i.observations || "").replace(/"/g, '""')}"`,
    ].join(";");
  });

  const csv = BOM + headers.join(";") + "\n" + rows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="rarostock_export.csv"',
    },
  });
}
