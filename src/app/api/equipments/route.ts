import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { equipments, equipmentMovements } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canManageStock, canView } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;
  const rows = await db.select().from(equipments).orderBy(desc(equipments.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, canManageStock);
  if (hasAuthError(auth)) return auth.response;
  const body = await req.json();
  const code = String(body.code || "").trim();
  const name = String(body.name || "").trim();
  const category = String(body.category || "").trim();
  if (!code || !name || !category) return NextResponse.json({ error: "Código, nome e categoria são obrigatórios." }, { status: 400 });
  const price = body.price === "" || body.price === null || body.price === undefined ? null : Number(body.price).toFixed(2);
  const [row] = await db.insert(equipments).values({
    code,
    name,
    category,
    brand: body.brand ? String(body.brand).trim() : null,
    price,
    observations: body.observations ? String(body.observations) : null,
    holderType: "company",
  }).returning();
  await db.insert(equipmentMovements).values({
    equipmentId: row.id,
    fromHolderType: "company",
    toHolderType: "company",
    reason: "Cadastro inicial",
    createdByUserId: auth.user.id,
  });
  return NextResponse.json(row, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const auth = await requirePermission(req, canManageStock);
  if (hasAuthError(auth)) return auth.response;
  const body = await req.json();
  const id = Number(body.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Equipamento inválido." }, { status: 400 });
  const [row] = await db.update(equipments).set({
    code: String(body.code || "").trim(),
    name: String(body.name || "").trim(),
    category: String(body.category || "").trim(),
    brand: body.brand ? String(body.brand).trim() : null,
    price: body.price === "" || body.price === null || body.price === undefined ? null : Number(body.price).toFixed(2),
    observations: body.observations ? String(body.observations) : null,
    active: typeof body.active === "boolean" ? body.active : true,
    updatedAt: new Date(),
  }).where(eq(equipments.id, id)).returning();
  if (!row) return NextResponse.json({ error: "Equipamento não encontrado." }, { status: 404 });
  return NextResponse.json(row);
}
