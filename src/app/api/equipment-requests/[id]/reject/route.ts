import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { equipmentMovements, equipmentRequests, equipments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canAdmin, canView } from "@/lib/roles";

const APPROVE = false;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;
  const { id } = await params;
  const requestId = Number(id);
  const body = await req.json().catch(() => ({}));
  const [request] = await db.select().from(equipmentRequests).where(eq(equipmentRequests.id, requestId)).limit(1);
  if (!request) return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
  if (request.status !== "pending") return NextResponse.json({ error: "Solicitação já foi concluída." }, { status: 400 });

  const isAdmin = canAdmin(auth.role);
  const responsibleUserId = request.type === "obtain" ? request.fromUserId : request.toUserId;
  const canDecide = isAdmin || responsibleUserId === auth.user.id;
  if (!canDecide) return NextResponse.json({ error: "Você não pode decidir esta solicitação." }, { status: 403 });

  const [updatedRequest] = await db.update(equipmentRequests).set({
    status: APPROVE ? "approved" : "rejected",
    decidedByUserId: auth.user.id,
    decidedAt: new Date(),
    decisionNote: typeof body.note === "string" ? body.note : null,
    updatedAt: new Date(),
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
    });
    return NextResponse.json({ request: updatedRequest, equipment });
  }

  return NextResponse.json({ request: updatedRequest });
}
