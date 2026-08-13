import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { equipmentRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canView } from "@/lib/roles";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;

  const { id } = await params;
  const requestId = Number(id);
  const body = await req.json().catch(() => ({}));
  const [request] = await db.select().from(equipmentRequests).where(eq(equipmentRequests.id, requestId)).limit(1);

  if (!request) return NextResponse.json({ error: "Solicita??o n?o encontrada." }, { status: 404 });
  if (request.status !== "pending") return NextResponse.json({ error: "Solicita??o j? foi conclu?da." }, { status: 400 });

  const responsibleUserId = request.type === "obtain" ? request.fromUserId : request.toUserId;
  const canDecide = responsibleUserId === auth.user.id && request.requesterUserId !== auth.user.id;
  if (!canDecide) return NextResponse.json({ error: "Voc? n?o pode decidir esta solicita??o." }, { status: 403 });

  const [updatedRequest] = await db.update(equipmentRequests).set({
    status: "rejected",
    decidedByUserId: auth.user.id,
    decidedAt: new Date(),
    decisionNote: typeof body.note === "string" ? body.note : null,
    updatedAt: new Date(),
  }).where(eq(equipmentRequests.id, requestId)).returning();

  return NextResponse.json({ request: updatedRequest });
}
