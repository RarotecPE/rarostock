import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { items } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canManageStock, canView } from "@/lib/roles";

function parseLimit(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

function validateConsumptionLimits(body: Record<string, unknown>) {
  if (body.type === "Equipamento") {
    return { minimumLimit: null, desiredLimit: null, error: null };
  }

  const minimumLimit = parseLimit(body.minimumLimit);
  const desiredLimit = parseLimit(body.desiredLimit);

  if (minimumLimit === null || desiredLimit === null) {
    return {
      minimumLimit,
      desiredLimit,
      error: "Limite mínimo e limite desejável são obrigatórios para Item de Consumo.",
    };
  }

  if (Number.isNaN(minimumLimit) || Number.isNaN(desiredLimit)) {
    return {
      minimumLimit,
      desiredLimit,
      error: "Os limites devem ser números inteiros maiores ou iguais a zero.",
    };
  }

  if (desiredLimit < minimumLimit) {
    return {
      minimumLimit,
      desiredLimit,
      error: "O limite desejável deve ser maior ou igual ao limite mínimo.",
    };
  }

  return { minimumLimit, desiredLimit, error: null };
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;

  const allItems = await db.select().from(items).orderBy(desc(items.createdAt));
  return NextResponse.json(allItems);
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, canManageStock);
  if (hasAuthError(auth)) return auth.response;

  const body = await req.json();
  const limits = validateConsumptionLimits(body);
  if (limits.error) {
    return NextResponse.json({ error: limits.error }, { status: 400 });
  }

  // Generate code RST-XXXX
  const lastItem = await db
    .select({ code: items.code })
    .from(items)
    .orderBy(desc(items.id))
    .limit(1);

  let nextNum = 1;
  if (lastItem.length > 0) {
    const match = lastItem[0].code.match(/RST-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const code = `RST-${String(nextNum).padStart(4, "0")}`;

  const result = await db
    .insert(items)
    .values({
      code,
      name: body.name,
      category: body.category,
      unit: body.unit,
      type: body.type,
      minimumLimit: limits.minimumLimit,
      desiredLimit: limits.desiredLimit,
      brand: body.brand || null,
      additionalUnit: body.additionalUnit || null,
      observations: body.observations || null,
      quantity: 0,
    })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission(req, canManageStock);
  if (hasAuthError(auth)) return auth.response;

  const body = await req.json();
  const { id, ...updates } = body;
  const current = await db.select({ type: items.type }).from(items).where(eq(items.id, id)).limit(1);
  if (!current.length) {
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  }
  const nextType = body.type === "Equipamento" || body.type === "Item de Consumo"
    ? body.type
    : current[0].type;
  const limits = validateConsumptionLimits({ ...body, type: nextType });
  if (limits.error) {
    return NextResponse.json({ error: limits.error }, { status: 400 });
  }

  delete updates.quantity;
  delete updates.code;
  updates.type = nextType;
  updates.minimumLimit = limits.minimumLimit;
  updates.desiredLimit = limits.desiredLimit;

  updates.updatedAt = new Date();

  const result = await db
    .update(items)
    .set(updates)
    .where(eq(items.id, id))
    .returning();

  return NextResponse.json(result[0]);
}

