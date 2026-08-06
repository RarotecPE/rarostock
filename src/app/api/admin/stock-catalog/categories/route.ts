import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { items, stockCategories } from "@/db/schema";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canAdmin } from "@/lib/roles";
import { normalizeActive, normalizeCatalogName } from "@/lib/stock-catalog-server";

async function requireAdmin(req: NextRequest) {
  const auth = await requirePermission(req, canAdmin);
  return hasAuthError(auth) ? auth.response : null;
}

async function readBody(req: NextRequest) {
  return req.json().catch(() => ({}));
}

function validationError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const body = await readBody(req);
  const name = normalizeCatalogName(body.name);
  if (!name) return validationError("Informe o nome da categoria.");

  try {
    const [created] = await db
      .insert(stockCategories)
      .values({
        name,
        active: normalizeActive(body.active),
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch {
    return validationError("Ja existe uma categoria com esse nome.", 409);
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const body = await readBody(req);
  const id = Number(body.id);
  const name = normalizeCatalogName(body.name);
  if (!Number.isInteger(id) || id <= 0) return validationError("Categoria invalida.");
  if (!name) return validationError("Informe o nome da categoria.");

  try {
    const [updated] = await db
      .update(stockCategories)
      .set({
        name,
        active: normalizeActive(body.active),
        updatedAt: new Date(),
      })
      .where(eq(stockCategories.id, id))
      .returning();

    if (!updated) return validationError("Categoria nao encontrada.", 404);
    return NextResponse.json(updated);
  } catch {
    return validationError("Ja existe uma categoria com esse nome.", 409);
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const body = await readBody(req);
  const id = Number(req.nextUrl.searchParams.get("id") ?? body.id);
  if (!Number.isInteger(id) || id <= 0) return validationError("Categoria invalida.");

  const [category] = await db.select().from(stockCategories).where(eq(stockCategories.id, id)).limit(1);
  if (!category) return validationError("Categoria nao encontrada.", 404);

  const used = await db.select({ id: items.id }).from(items).where(eq(items.category, category.name)).limit(1);
  if (used.length > 0) {
    return validationError("Esta categoria esta em uso. Desative-a em vez de excluir.", 409);
  }

  await db.delete(stockCategories).where(eq(stockCategories.id, id));
  const categories = await db.select().from(stockCategories).orderBy(asc(stockCategories.name));
  return NextResponse.json({ categories });
}