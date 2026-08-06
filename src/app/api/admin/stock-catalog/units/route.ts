import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { items, stockUnits } from "@/db/schema";
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
  const pluralName = normalizeCatalogName(body.pluralName) || name;
  if (!name) return validationError("Informe o nome da unidade.");

  try {
    const [created] = await db
      .insert(stockUnits)
      .values({
        name,
        pluralName,
        active: normalizeActive(body.active),
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch {
    return validationError("Ja existe uma unidade com esse nome.", 409);
  }
}

export async function PUT(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const body = await readBody(req);
  const id = Number(body.id);
  const name = normalizeCatalogName(body.name);
  const pluralName = normalizeCatalogName(body.pluralName) || name;
  if (!Number.isInteger(id) || id <= 0) return validationError("Unidade invalida.");
  if (!name) return validationError("Informe o nome da unidade.");

  try {
    const [updated] = await db
      .update(stockUnits)
      .set({
        name,
        pluralName,
        active: normalizeActive(body.active),
        updatedAt: new Date(),
      })
      .where(eq(stockUnits.id, id))
      .returning();

    if (!updated) return validationError("Unidade nao encontrada.", 404);
    return NextResponse.json(updated);
  } catch {
    return validationError("Ja existe uma unidade com esse nome.", 409);
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const body = await readBody(req);
  const id = Number(req.nextUrl.searchParams.get("id") ?? body.id);
  if (!Number.isInteger(id) || id <= 0) return validationError("Unidade invalida.");

  const [unit] = await db.select().from(stockUnits).where(eq(stockUnits.id, id)).limit(1);
  if (!unit) return validationError("Unidade nao encontrada.", 404);

  const used = await db.select({ id: items.id }).from(items).where(eq(items.unit, unit.name)).limit(1);
  if (used.length > 0) {
    return validationError("Esta unidade esta em uso. Desative-a em vez de excluir.", 409);
  }

  await db.delete(stockUnits).where(eq(stockUnits.id, id));
  const units = await db.select().from(stockUnits).orderBy(asc(stockUnits.name));
  return NextResponse.json({ units });
}