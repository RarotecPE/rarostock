import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { equipmentMovements, equipments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canView } from "@/lib/roles";
import { assignMovementTermPayload, termTypeFromValue, uploadOptionalEquipmentTermFromFormData } from "@/lib/equipment-terms";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;
  const { id } = await params;
  const movementId = Number(id);
  const formData = await req.formData();
  const termType = termTypeFromValue(formData.get("termType"));
  if (!termType) return NextResponse.json({ error: "Tipo de termo inválido." }, { status: 400 });

  const [row] = await db.select({
    movement: equipmentMovements,
    equipmentRequiresResponsibilityTerm: equipments.requiresResponsibilityTerm,
  }).from(equipmentMovements)
    .innerJoin(equipments, eq(equipments.id, equipmentMovements.equipmentId))
    .where(eq(equipmentMovements.id, movementId))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Movimentação não encontrada." }, { status: 404 });

  const movement = row.movement;
  const responsibleUserId = termType === "responsibility" ? movement.toUserId : movement.fromUserId;
  if (!responsibleUserId || responsibleUserId !== auth.user.id) {
    return NextResponse.json({ error: "Você não pode anexar este termo." }, { status: 403 });
  }

  const termPayload = await uploadOptionalEquipmentTermFromFormData(formData, termType);
  if (!termPayload) return NextResponse.json({ error: "Envie um arquivo de termo." }, { status: 400 });

  const [updated] = await db.update(equipmentMovements).set({
    ...assignMovementTermPayload(termType, termPayload),
  }).where(eq(equipmentMovements.id, movementId)).returning();

  return NextResponse.json(updated);
}
