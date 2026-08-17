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

function getEnv(name: string, fallback?: string) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function parseProductIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, canExport);
  if (hasAuthError(auth)) return auth.response;

  const payload = await req.json().catch(() => ({}));
  const search = typeof payload.search === "string" ? payload.search : null;
  const categories = Array.isArray(payload.categories) ? payload.categories.filter((item: unknown): item is string => typeof item === "string") : [];
  const statuses = Array.isArray(payload.statuses) ? payload.statuses.filter((item: unknown): item is string => typeof item === "string") : [];
  const productIds = parseProductIds(payload.productIds);

  if (productIds.length === 0) {
    return NextResponse.json({ error: "Selecione ao menos um produto para enviar." }, { status: 422 });
  }

  try {
    const shoppingItems = await listShoppingItems({ search, categories, statuses, productIds });
    if (shoppingItems.length === 0) {
      return NextResponse.json({ error: "Nenhum produto selecionado precisa de reposição." }, { status: 422 });
    }

    const filtersLabel = formatShoppingListFilters(search, categories, statuses);
    const pdf = await renderShoppingListPdf(shoppingItems, filtersLabel);
    const filename = getShoppingListFilename();
    const totalQuantity = shoppingItems.reduce((sum, item) => sum + item.purchaseQuantity, 0);
    const body = `
      <p>Olá, ${escapeHtml(auth.user.nome || auth.user.email)}.</p>
      <p>Sua lista de compras do RaroStock foi gerada com <strong>${shoppingItems.length} ${shoppingItems.length === 1 ? "produto" : "produtos"}</strong> e <strong>${totalQuantity} ${totalQuantity === 1 ? "unidade sugerida" : "unidades sugeridas"}</strong>.</p>
      <p>Filtros aplicados: ${escapeHtml(filtersLabel)}.</p>
      <p>O PDF completo está anexado a este e-mail.</p>
    `;

    const response = await fetch(new URL("/api/email/shopping-list", getEnv("RARONEXUS_BASE_URL", "http://localhost:3001")), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-RaroNexus-Client-Id": getEnv("RARONEXUS_CLIENT_ID", "rarostock"),
        "X-RaroNexus-Client-Secret": getEnv("RARONEXUS_CLIENT_SECRET"),
      },
      body: JSON.stringify({
        to: auth.user.email,
        subject: "Lista de compras RaroStock",
        body,
        attachments: [
          {
            filename,
            content_type: "application/pdf",
            content_base64: pdf.toString("base64"),
          },
        ],
        metadata: {
          source: "shopping_list",
          product_count: shoppingItems.length,
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      return NextResponse.json({ error: errorPayload?.message ?? errorPayload?.error ?? "Não foi possível enviar o e-mail." }, { status: response.status });
    }

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("Failed to email shopping list PDF", error);
    return NextResponse.json({ error: "Não foi possível enviar a lista de compras por e-mail." }, { status: 500 });
  }
}
