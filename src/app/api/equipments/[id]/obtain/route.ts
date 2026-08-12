import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { equipments, equipmentMovements } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canView } from "@/lib/roles";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;
  const { id } = await params;
  const equipmentId = Number(id);
  const body = await req.json().catch(() => ({}));
  const [equipment] = await db.select().from(equipments).where(eq(equipments.id, equipmentId)).limit(1);
  if (!equipment) return NextResponse.json({ error: "Equipamento não encontrado." }, { status: 404 });
  if (equipment.holderType !== "company") return NextResponse.json({ error: "Equipamento já está alocado. Solicite uma transferência." }, { status: 400 });

  const [updated] = await db.update(equipments).set({
    holderType: "user",
    holderUserId: auth.user.id,
    holderUserName: auth.user.nome,
    holderUserEmail: auth.user.email,
    updatedAt: new Date(),
  }).where(eq(equipments.id, equipmentId)).returning();
  await db.insert(equipmentMovements).values({
    equipmentId,
    fromHolderType: "company",
    toHolderType: "user",
    toUserId: auth.user.id,
    toUserName: auth.user.nome,
    toUserEmail: auth.user.email,
    reason: typeof body.reason === "string" ? body.reason : null,
    createdByUserId: auth.user.id,
  });
  return NextResponse.json(updated);
}
