import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { equipmentCategories, equipments } from "@/db/schema";
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
      .insert(equipmentCategories)
      .values({ name, active: normalizeActive(body.active) })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch {
    return validationError("Já existe uma categoria de equipamento com esse nome.", 409);
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const body = await readBody(req);
  const id = Number(body.id);
  const name = normalizeCatalogName(body.name);
  if (!Number.isInteger(id) || id <= 0) return validationError("Categoria inválida.");
  if (!name) return validationError("Informe o nome da categoria.");

  try {
    const [updated] = await db
      .update(equipmentCategories)
      .set({ name, active: normalizeActive(body.active), updatedAt: new Date() })
      .where(eq(equipmentCategories.id, id))
      .returning();

    if (!updated) return validationError("Categoria não encontrada.", 404);
    return NextResponse.json(updated);
  } catch {
    return validationError("Já existe uma categoria de equipamento com esse nome.", 409);
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const body = await readBody(req);
  const id = Number(req.nextUrl.searchParams.get("id") ?? body.id);
  if (!Number.isInteger(id) || id <= 0) return validationError("Categoria inválida.");

  const [category] = await db.select().from(equipmentCategories).where(eq(equipmentCategories.id, id)).limit(1);
  if (!category) return validationError("Categoria não encontrada.", 404);

  const used = await db.select({ id: equipments.id }).from(equipments).where(eq(equipments.category, category.name)).limit(1);
  if (used.length > 0) {
    return validationError("Esta categoria está em uso. Desative-a em vez de excluir.", 409);
  }

  await db.delete(equipmentCategories).where(eq(equipmentCategories.id, id));
  const categories = await db.select().from(equipmentCategories).orderBy(asc(equipmentCategories.name));
  return NextResponse.json({ categories });
}
