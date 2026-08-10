import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { equipments, equipmentMovements, equipmentRequests } from "@/db/schema";
import { and, eq } from "drizzle-orm";
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
  if (equipment.holderUserId !== auth.user.id) return NextResponse.json({ error: "Você só pode devolver equipamentos que estão com você." }, { status: 403 });

  if (body.toUserId && body.toUserId !== "company") {
    const target = { id: String(body.toUserId), nome: String(body.toUserName || "Usuário"), email: String(body.toUserEmail || "") };
    const [pendingRequest] = await db.select({ id: equipmentRequests.id }).from(equipmentRequests).where(and(
      eq(equipmentRequests.equipmentId, equipmentId),
      eq(equipmentRequests.requesterUserId, auth.user.id),
      eq(equipmentRequests.status, "pending"),
    )).limit(1);
    if (pendingRequest) {
      return NextResponse.json({ error: "Você já possui uma solicitação pendente para este equipamento." }, { status: 409 });
    }

    try {
      const [request] = await db.insert(equipmentRequests).values({
        equipmentId,
        type: "transfer",
        requesterUserId: auth.user.id,
        requesterName: auth.user.nome,
        requesterEmail: auth.user.email,
        fromHolderType: "user",
        fromUserId: auth.user.id,
        fromUserName: auth.user.nome,
        fromUserEmail: auth.user.email,
        toHolderType: "user",
        toUserId: target.id,
        toUserName: target.nome,
        toUserEmail: target.email,
        reason: typeof body.reason === "string" ? body.reason : null,
      }).returning();
      return NextResponse.json(request, { status: 201 });
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        return NextResponse.json({ error: "Você já possui uma solicitação pendente para este equipamento." }, { status: 409 });
      }
      throw error;
    }
  }

  const [updated] = await db.update(equipments).set({
    holderType: "company",
    holderUserId: null,
    holderUserName: null,
    holderUserEmail: null,
    updatedAt: new Date(),
  }).where(eq(equipments.id, equipmentId)).returning();
  await db.insert(equipmentMovements).values({
    equipmentId,
    fromHolderType: "user",
    fromUserId: auth.user.id,
    fromUserName: auth.user.nome,
    fromUserEmail: auth.user.email,
    toHolderType: "company",
    reason: typeof body.reason === "string" ? body.reason : "Devolução para RAROTEC",
    createdByUserId: auth.user.id,
  });
  return NextResponse.json(updated);
}
