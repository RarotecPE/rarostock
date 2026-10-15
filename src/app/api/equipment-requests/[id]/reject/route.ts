import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { equipmentRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canView } from "@/lib/roles";
import { auditClient, getRequestContext } from "@/lib/audit";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;

  const { id } = await params;
  const requestId = Number(id);
  const body = await req.json().catch(() => ({}));
  const [request] = await db.select().from(equipmentRequests).where(eq(equipmentRequests.id, requestId)).limit(1);

  if (!request) return NextResponse.json({ error: "Solicitação não encontrada." }, { status: 404 });
  if (request.status !== "pending") return NextResponse.json({ error: "Solicitação já foi concluída." }, { status: 400 });

  const responsibleUserId = request.type === "obtain" ? request.fromUserId : request.toUserId;
  const canDecide = responsibleUserId === auth.user.id && request.requesterUserId !== auth.user.id;
  if (!canDecide) return NextResponse.json({ error: "Você não pode decidir esta solicitação." }, { status: 403 });

  const [updatedRequest] = await db.update(equipmentRequests).set({
    status: "rejected",
    decidedByUserId: auth.user.id,
    decidedAt: new Date(),
    decisionNote: typeof body.note === "string" ? body.note : null,
    updatedAt: new Date(),
  }).where(eq(equipmentRequests.id, requestId)).returning();

  auditClient.log({
    system: "rarostock",
    category: "inventory",
    action: "equipment_request.rejected",
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
        type: "equipment",
        id: String(request.equipmentId),
        label: `Equipamento #${request.equipmentId}`,
      },
      {
        type: "equipment_request",
        id: String(request.id),
        label: `Solicitação #${request.id}`,
      },
    ],
    context: getRequestContext(req),
    details: {
      requestId: request.id,
      equipmentId: request.equipmentId,
      requesterUserId: request.requesterUserId,
      fromUserId: request.fromUserId,
      toUserId: request.toUserId,
      decisionNote: updatedRequest.decisionNote,
    },
  });

  return NextResponse.json({ request: updatedRequest });
}
