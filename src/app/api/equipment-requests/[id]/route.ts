import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { equipmentRequests, equipments } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canAdmin, canView } from "@/lib/roles";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;

  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isFinite(requestId)) {
    return NextResponse.json({ error: "Solicitacao invalida." }, { status: 400 });
  }

  const visibility = canAdmin(auth.role)
    ? undefined
    : or(
        eq(equipmentRequests.requesterUserId, auth.user.id),
        eq(equipmentRequests.toUserId, auth.user.id),
        eq(equipmentRequests.fromUserId, auth.user.id),
      )!;

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
    responsibilityTermUrl: equipmentRequests.responsibilityTermUrl,
    responsibilityTermFilename: equipmentRequests.responsibilityTermFilename,
    responsibilityTermStoragePath: equipmentRequests.responsibilityTermStoragePath,
    devolutionTermUrl: equipmentRequests.devolutionTermUrl,
    devolutionTermFilename: equipmentRequests.devolutionTermFilename,
    devolutionTermStoragePath: equipmentRequests.devolutionTermStoragePath,
    equipmentRequiresResponsibilityTerm: equipments.requiresResponsibilityTerm,
    decidedByUserId: equipmentRequests.decidedByUserId,
    decidedAt: equipmentRequests.decidedAt,
    decisionNote: equipmentRequests.decisionNote,
    createdAt: equipmentRequests.createdAt,
    updatedAt: equipmentRequests.updatedAt,
    equipmentCode: equipments.code,
    equipmentName: equipments.name,
  }).from(equipmentRequests)
    .innerJoin(equipments, eq(equipments.id, equipmentRequests.equipmentId))
    .where(visibility ? and(eq(equipmentRequests.id, requestId), visibility) : eq(equipmentRequests.id, requestId))
    .limit(1);

  const request = rows[0];
  if (!request) return NextResponse.json({ error: "Solicitacao nao encontrada." }, { status: 404 });

  return NextResponse.json(request);
}