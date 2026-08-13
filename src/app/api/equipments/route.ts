import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { equipments, equipmentMovements } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canAdmin, canManageStock, canView } from "@/lib/roles";
import { deleteInvoiceFromFtp } from "@/lib/ftp-storage";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;
  const rows = await db.select().from(equipments).where(eq(equipments.active, true)).orderBy(desc(equipments.createdAt));
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
    invoiceUrl: body.invoiceUrl ? String(body.invoiceUrl).trim() : null,
    invoiceFilename: body.invoiceFilename ? String(body.invoiceFilename).trim() : null,
    invoiceStoragePath: body.invoiceStoragePath ? String(body.invoiceStoragePath).trim() : null,
    requiresResponsibilityTerm: body.requiresResponsibilityTerm === true,
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

  const [current] = await db.select().from(equipments).where(eq(equipments.id, id)).limit(1);
  if (!current) return NextResponse.json({ error: "Equipamento não encontrado." }, { status: 404 });

  const nextInvoiceUrl = body.invoiceUrl === undefined ? current.invoiceUrl : body.invoiceUrl ? String(body.invoiceUrl).trim() : null;
  const nextInvoiceFilename = body.invoiceFilename === undefined ? current.invoiceFilename : body.invoiceFilename ? String(body.invoiceFilename).trim() : null;
  const nextInvoiceStoragePath = body.invoiceStoragePath === undefined ? current.invoiceStoragePath : body.invoiceStoragePath ? String(body.invoiceStoragePath).trim() : null;

  if (
    current.invoiceStoragePath &&
    nextInvoiceStoragePath &&
    current.invoiceStoragePath !== nextInvoiceStoragePath
  ) {
    try {
      await deleteInvoiceFromFtp(current.invoiceStoragePath);
    } catch (error) {
      console.error("Failed to delete old equipment invoice", error);
    }
  }

  const [row] = await db.update(equipments).set({
    code: String(body.code || "").trim(),
    name: String(body.name || "").trim(),
    category: String(body.category || "").trim(),
    brand: body.brand ? String(body.brand).trim() : null,
    price: body.price === "" || body.price === null || body.price === undefined ? null : Number(body.price).toFixed(2),
    invoiceUrl: nextInvoiceUrl,
    invoiceFilename: nextInvoiceFilename,
    invoiceStoragePath: nextInvoiceStoragePath,
    requiresResponsibilityTerm: body.requiresResponsibilityTerm === undefined ? current.requiresResponsibilityTerm : body.requiresResponsibilityTerm === true,
    observations: body.observations ? String(body.observations) : null,
    active: typeof body.active === "boolean" ? body.active : true,
    updatedAt: new Date(),
  }).where(eq(equipments.id, id)).returning();
  return NextResponse.json(row);
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePermission(req, canAdmin);
  if (hasAuthError(auth)) return auth.response;

  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Equipamento inválido." }, { status: 400 });

  const [current] = await db.select().from(equipments).where(eq(equipments.id, id)).limit(1);
  if (!current) return NextResponse.json({ error: "Equipamento não encontrado." }, { status: 404 });

  await db.update(equipments).set({
    active: false,
    updatedAt: new Date(),
  }).where(eq(equipments.id, id));

  return NextResponse.json({ ok: true });
}




