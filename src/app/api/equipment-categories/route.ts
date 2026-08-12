import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { equipmentCategories } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canManageStock, canView } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;
  const rows = await db.select().from(equipmentCategories).where(eq(equipmentCategories.active, true)).orderBy(asc(equipmentCategories.name));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, canManageStock);
  if (hasAuthError(auth)) return auth.response;
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Informe o nome da categoria." }, { status: 400 });
  const [row] = await db.insert(equipmentCategories).values({ name }).onConflictDoUpdate({ target: equipmentCategories.name, set: { active: true, updatedAt: new Date() } }).returning();
  return NextResponse.json(row, { status: 201 });
}
