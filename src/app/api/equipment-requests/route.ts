import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { equipmentRequests, equipments } from "@/db/schema";
import { and, desc, eq, or } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canAdmin, canView } from "@/lib/roles";
import { autoMatchEquipmentRequest } from "@/lib/equipment-request-matching";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "all";
  const status = url.searchParams.get("status") || "pending";
  const conditions = [];
  if (status !== "all") conditions.push(eq(equipmentRequests.status, status as "pending" | "approved" | "rejected" | "cancelled"));
  if (scope === "notifications") {
    if (!canAdmin(auth.role)) {
      conditions.push(or(
        eq(equipmentRequests.requesterUserId, auth.user.id),
        eq(equipmentRequests.fromUserId, auth.user.id),
        eq(equipmentRequests.toUserId, auth.user.id),
      )!);
    }
  } else if (scope === "received") {
    conditions.push(or(eq(equipmentRequests.toUserId, auth.user.id), eq(equipmentRequests.fromUserId, auth.user.id))!);
  } else if (scope === "sent") {
    conditions.push(eq(equipmentRequests.requesterUserId, auth.user.id));
  } else if (scope === "mine") {
    conditions.push(or(eq(equipmentRequests.requesterUserId, auth.user.id), eq(equipmentRequests.toUserId, auth.user.id), eq(equipmentRequests.fromUserId, auth.user.id))!);
  }

  const rows = await db.select({
    id: equipmentRequests.id,
    equipmentId: equipmentRequests.equipmentId,
    type: equipmentRequests.type,
    status: equipmentRequests.status,
    requesterUserId: equipmentRequests.requesterUserId,
    requesterName: equipmentRequests.requesterName,
    requesterEmail: equipmentRequests.requesterEmail,
    fromHolderType: equipmentRequests.fromHolderType,
    fromUserId: equipmentRequests.fromUserId,
    fromUserName: equipmentRequests.fromUserName,
    fromUserEmail: equipmentRequests.fromUserEmail,
    toHolderType: equipmentRequests.toHolderType,
    toUserId: equipmentRequests.toUserId,
    toUserName: equipmentRequests.toUserName,
    toUserEmail: equipmentRequests.toUserEmail,
    reason: equipmentRequests.reason,
    decidedByUserId: equipmentRequests.decidedByUserId,
    decidedAt: equipmentRequests.decidedAt,
    decisionNote: equipmentRequests.decisionNote,
    createdAt: equipmentRequests.createdAt,
    updatedAt: equipmentRequests.updatedAt,
    equipmentCode: equipments.code,
    equipmentName: equipments.name,
  }).from(equipmentRequests)
    .innerJoin(equipments, eq(equipments.id, equipmentRequests.equipmentId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(equipmentRequests.createdAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;
  const body = await req.json();
  const equipmentId = Number(body.equipmentId);
  const [equipment] = await db.select().from(equipments).where(eq(equipments.id, equipmentId)).limit(1);
  if (!equipment) return NextResponse.json({ error: "Equipamento não encontrado." }, { status: 404 });
  if (equipment.holderType !== "user" || !equipment.holderUserId) {
    return NextResponse.json({ error: "Este equipamento está disponível para obtenção direta." }, { status: 400 });
  }
  if (equipment.holderUserId === auth.user.id) {
    return NextResponse.json({ error: "Use a ação de devolver ou transferir para equipamentos que estão com você." }, { status: 400 });
  }

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
      type: "obtain",
      requesterUserId: auth.user.id,
      requesterName: auth.user.nome,
      requesterEmail: auth.user.email,
      fromHolderType: "user",
      fromUserId: equipment.holderUserId,
      fromUserName: equipment.holderUserName,
      fromUserEmail: equipment.holderUserEmail,
      toHolderType: "user",
      toUserId: auth.user.id,
      toUserName: auth.user.nome,
      toUserEmail: auth.user.email,
      reason: typeof body.reason === "string" ? body.reason : null,
    }).returning();
    const match = await autoMatchEquipmentRequest(request, auth.user.id);
    if (match) {
      return NextResponse.json({ ...match, autoApproved: true }, { status: 201 });
    }
    return NextResponse.json(request, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "Você já possui uma solicitação pendente para este equipamento." }, { status: 409 });
    }
    throw error;
  }
}
