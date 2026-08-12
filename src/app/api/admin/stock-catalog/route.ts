import { NextRequest, NextResponse } from "next/server";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canAdmin } from "@/lib/roles";
import { listEquipmentCategories, listStockCatalog } from "@/lib/stock-catalog-server";

function getDatabaseErrorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
}

function getDatabaseErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isMissingCatalogTable(error: unknown) {
  const code = getDatabaseErrorCode(error);
  const message = getDatabaseErrorMessage(error);
  return code === "42P01" || message.includes("does not exist") || message.includes("relation");
}

function isPermissionDenied(error: unknown) {
  const code = getDatabaseErrorCode(error);
  const message = getDatabaseErrorMessage(error).toLowerCase();
  return code === "42501" || message.includes("permission denied");
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, canAdmin);
  if (hasAuthError(auth)) return auth.response;

  try {
    const catalog = await listStockCatalog(true);
    const equipmentCategories = await listEquipmentCategories(true);
    return NextResponse.json({ ...catalog, equipmentCategories });
  } catch (error) {
    console.error("Failed to load stock catalog", error);

    return NextResponse.json(
      {
        error: isPermissionDenied(error)
          ? "Usuário do banco sem permissão para acessar o catálogo. Aplique os GRANTs nas tabelas stock_categories, stock_units e equipment_categories."
          : isMissingCatalogTable(error)
            ? "Catálogo não encontrado no banco. Aplique as migrations 003_stock_catalog.sql e 005_products_equipments_split.sql no banco do RaroStock."
            : "Não foi possível carregar o catálogo.",
      },
      { status: 500 },
    );
  }
}
