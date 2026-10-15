import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { equipmentMovements, equipments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canView } from "@/lib/roles";
import { assignMovementTermPayload, termTypeFromValue, uploadOptionalEquipmentTermFromFormData } from "@/lib/equipment-terms";
import { auditClient, getRequestContext } from "@/lib/audit";

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

  auditClient.log({
    system: "rarostock",
    category: "inventory",
    action: "equipment_term.uploaded",
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
        id: String(movement.equipmentId),
        label: `Equipamento #${movement.equipmentId}`,
      },
      {
        type: "equipment_movement",
        id: String(movementId),
        label: `Movimentação #${movementId}`,
      },
    ],
    context: getRequestContext(req),
    details: {
      movementId,
      equipmentId: movement.equipmentId,
      termType,
      filename: termPayload.filename,
      storagePath: termPayload.storagePath,
    },
  });

  return NextResponse.json(updated);
}
