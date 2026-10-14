import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canManageStock, canView } from "@/lib/roles";
import { auditClient, getRequestContext } from "@/lib/audit";

function parseLimit(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

function validateProductLimits(body: Record<string, unknown>) {
  const minimumLimit = parseLimit(body.minimumLimit);
  const desiredLimit = parseLimit(body.desiredLimit);

  if (minimumLimit === null || desiredLimit === null) {
    return { minimumLimit, desiredLimit, error: "Limite mínimo e limite desejável são obrigatórios." };
  }

  if (Number.isNaN(minimumLimit) || Number.isNaN(desiredLimit)) {
    return { minimumLimit, desiredLimit, error: "Os limites devem ser números inteiros maiores ou iguais a zero." };
  }

  if (desiredLimit < minimumLimit) {
    return { minimumLimit, desiredLimit, error: "O limite desejável deve ser maior ou igual ao limite mínimo." };
  }

  return { minimumLimit, desiredLimit, error: null };
}

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;

  const allProducts = await db.select().from(products).orderBy(desc(products.createdAt));
  return NextResponse.json(allProducts);
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, canManageStock);
  if (hasAuthError(auth)) return auth.response;

  const body = await req.json();
  const limits = validateProductLimits(body);
  if (limits.error) return NextResponse.json({ error: limits.error }, { status: 400 });

  const lastProduct = await db.select({ code: products.code }).from(products).orderBy(desc(products.id)).limit(1);
  let nextNum = 1;
  if (lastProduct.length > 0) {
    const match = lastProduct[0].code.match(/RST-(\d+)/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  const code = `RST-${String(nextNum).padStart(4, "0")}`;

  const result = await db.insert(products).values({
    code,
    name: String(body.name || "").trim(),
    category: String(body.category || "").trim(),
    unit: String(body.unit || "").trim(),
    minimumLimit: limits.minimumLimit!,
    desiredLimit: limits.desiredLimit!,
    brand: body.brand ? String(body.brand) : null,
    additionalUnit: body.additionalUnit ? String(body.additionalUnit) : null,
    observations: body.observations ? String(body.observations) : null,
    quantity: 0,
  }).returning();

  const created = result[0];

  auditClient.log({
    system: "rarostock",
    category: "inventory",
    action: "product.created",
    severity: "INFO",
    status: "SUCCESS",
    actor: {
      type: "user",
      userId: auth.user.id,
      name: auth.user.nome,
      email: auth.user.email,
      role: auth.role,
    },
    targets: [
      {
        type: "product",
        id: String(created.id),
        label: `${created.code} - ${created.name}`,
      },
    ],
    context: getRequestContext(req),
    details: {
      code: created.code,
      name: created.name,
      category: created.category,
      unit: created.unit,
      minimumLimit: created.minimumLimit,
      desiredLimit: created.desiredLimit,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission(req, canManageStock);
  if (hasAuthError(auth)) return auth.response;

  const body = await req.json();
  const id = Number(body.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Produto inválido." }, { status: 400 });

  const limits = validateProductLimits(body);
  if (limits.error) return NextResponse.json({ error: limits.error }, { status: 400 });

  const result = await db.update(products).set({
    name: String(body.name || "").trim(),
    category: String(body.category || "").trim(),
    unit: String(body.unit || "").trim(),
    minimumLimit: limits.minimumLimit!,
    desiredLimit: limits.desiredLimit!,
    brand: body.brand ? String(body.brand) : null,
    additionalUnit: body.additionalUnit ? String(body.additionalUnit) : null,
    observations: body.observations ? String(body.observations) : null,
    updatedAt: new Date(),
  }).where(eq(products.id, id)).returning();

  if (!result.length) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  const updated = result[0];

  auditClient.log({
    system: "rarostock",
    category: "inventory",
    action: "product.updated",
    severity: "INFO",
    status: "SUCCESS",
    actor: {
      type: "user",
      userId: auth.user.id,
      name: auth.user.nome,
      email: auth.user.email,
      role: auth.role,
    },
    targets: [
      {
        type: "product",
        id: String(updated.id),
        label: `${updated.code} - ${updated.name}`,
      },
    ],
    context: getRequestContext(req),
    details: {
      code: updated.code,
      name: updated.name,
      category: updated.category,
      unit: updated.unit,
      minimumLimit: updated.minimumLimit,
      desiredLimit: updated.desiredLimit,
    },
  });

  return NextResponse.json(updated);
}
