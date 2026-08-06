import { NextRequest, NextResponse } from "next/server";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canView } from "@/lib/roles";
import { listStockCatalog } from "@/lib/stock-catalog-server";

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
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;

  try {
    return NextResponse.json(await listStockCatalog(false));
  } catch (error) {
    console.error("Failed to load stock catalog", error);

    return NextResponse.json(
      {
        error: isPermissionDenied(error)
          ? "Usu\u00e1rio do banco sem permiss\u00e3o para acessar o cat\u00e1logo. Aplique os GRANTs nas tabelas stock_categories e stock_units."
          : isMissingCatalogTable(error)
            ? "Cat\u00e1logo n\u00e3o encontrado no banco. Aplique a migration 003_stock_catalog.sql no banco do RaroStock."
            : "N\u00e3o foi poss\u00edvel carregar o cat\u00e1logo.",
      },
      { status: 500 }
    );
  }
}
