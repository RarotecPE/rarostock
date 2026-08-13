import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { equipmentMovements, equipmentRequests, equipments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canView } from "@/lib/roles";
import { cancelPendingEquipmentRequestsForHolderChange } from "@/lib/equipment-request-cancellation";
import { assignMovementTermPayload, hasConfirmedMissingTerm, parseRequestWithOptionalEquipmentTerm } from "@/lib/equipment-terms";

const APPROVE = true;

function requestResponsibilityTerm(request: typeof equipmentRequests.$inferSelect) {
  return request.responsibilityTermUrl ? {
    responsibilityTermUrl: request.responsibilityTermUrl,
    responsibilityTermFilename: request.responsibilityTermFilename,
    responsibilityTermStoragePath: request.responsibilityTermStoragePath,
  } : {};
}

function requestDevolutionTerm(request: typeof equipmentRequests.$inferSelect) {
  return request.devolutionTermUrl ? {
    devolutionTermUrl: request.devolutionTermUrl,
    devolutionTermFilename: request.devolutionTermFilename,
    devolutionTermStoragePath: request.devolutionTermStoragePath,
  } : {};
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;
  const { id } = await params;
  const requestId = Number(id);
  const [request] = await db.select().from(equipmentRequests).where(eq(equipmentRequests.id, requestId)).limit(1);
  if (!request) return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
  if (request.status !== "pending") return NextResponse.json({ error: "Solicitação já foi concluída." }, { status: 400 });

  const responsibleUserId = request.type === "obtain" ? request.fromUserId : request.toUserId;
  const canDecide = responsibleUserId === auth.user.id && request.requesterUserId !== auth.user.id;
  if (!canDecide) return NextResponse.json({ error: "Você não pode decidir esta solicitação." }, { status: 403 });

  const decisionTermType = request.type === "obtain" ? "devolution" : "responsibility";
  const { body, termPayload } = await parseRequestWithOptionalEquipmentTerm(req, decisionTermType);
  const [currentEquipment] = await db.select().from(equipments).where(eq(equipments.id, request.equipmentId)).limit(1);
  if (!currentEquipment) return NextResponse.json({ error: "Equipamento não encontrado." }, { status: 404 });

  const hasDecisionTerm = decisionTermType === "devolution"
    ? Boolean(termPayload || request.devolutionTermUrl)
    : Boolean(termPayload || request.responsibilityTermUrl);
  if (currentEquipment.requiresResponsibilityTerm && !hasDecisionTerm && !hasConfirmedMissingTerm(body.confirmMissingTerm)) {
    return NextResponse.json({ code: "TERM_CONFIRMATION_REQUIRED", error: "Este equipamento exige termo. Confirme para aprovar sem anexar." }, { status: 409 });
  }

  const [updatedRequest] = await db.update(equipmentRequests).set({
    status: APPROVE ? "approved" : "rejected",
    decidedByUserId: auth.user.id,
    decidedAt: new Date(),
    decisionNote: typeof body.note === "string" ? body.note : null,
    updatedAt: new Date(),
    ...(decisionTermType === "responsibility" ? assignMovementTermPayload("responsibility", termPayload) : assignMovementTermPayload("devolution", termPayload)),
  }).where(eq(equipmentRequests.id, requestId)).returning();

  if (APPROVE) {
    const [equipment] = await db.update(equipments).set({
      holderType: request.toHolderType,
      holderUserId: request.toUserId,
      holderUserName: request.toUserName,
      holderUserEmail: request.toUserEmail,
      updatedAt: new Date(),
    }).where(eq(equipments.id, request.equipmentId)).returning();
    await db.insert(equipmentMovements).values({
      equipmentId: request.equipmentId,
      fromHolderType: request.fromHolderType,
      fromUserId: request.fromUserId,
      fromUserName: request.fromUserName,
      fromUserEmail: request.fromUserEmail,
      toHolderType: request.toHolderType,
      toUserId: request.toUserId,
      toUserName: request.toUserName,
      toUserEmail: request.toUserEmail,
      reason: request.reason,
      requestId: request.id,
      createdByUserId: auth.user.id,
      ...requestResponsibilityTerm(updatedRequest),
      ...requestDevolutionTerm(updatedRequest),
    });
    if (request.fromHolderType === "user" && request.fromUserId) {
      await cancelPendingEquipmentRequestsForHolderChange({
        equipmentId: request.equipmentId,
        previousHolderUserId: request.fromUserId,
        decidedByUserId: auth.user.id,
        exceptRequestIds: [request.id],
        note: "Anulada automaticamente porque outra solicitação movimentou este equipamento.",
      });
    }
    return NextResponse.json({ request: updatedRequest, equipment });
  }

  return NextResponse.json({ request: updatedRequest });
}
