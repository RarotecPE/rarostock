import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { equipmentMovements, equipments } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canAdmin, canView } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;

  const rows = await db.select({
    movementId: equipmentMovements.id,
    equipmentId: equipmentMovements.equipmentId,
    equipmentCode: equipments.code,
    equipmentName: equipments.name,
    fromHolderType: equipmentMovements.fromHolderType,
    fromUserId: equipmentMovements.fromUserId,
    fromUserName: equipmentMovements.fromUserName,
    fromUserEmail: equipmentMovements.fromUserEmail,
    toHolderType: equipmentMovements.toHolderType,
    toUserId: equipmentMovements.toUserId,
    toUserName: equipmentMovements.toUserName,
    toUserEmail: equipmentMovements.toUserEmail,
    responsibilityTermUrl: equipmentMovements.responsibilityTermUrl,
    devolutionTermUrl: equipmentMovements.devolutionTermUrl,
    createdAt: equipmentMovements.createdAt,
  }).from(equipmentMovements)
    .innerJoin(equipments, eq(equipments.id, equipmentMovements.equipmentId))
    .where(and(eq(equipments.requiresResponsibilityTerm, true), eq(equipments.active, true)))
    .orderBy(desc(equipmentMovements.createdAt), desc(equipmentMovements.id));

  const isAdmin = canAdmin(auth.role);
  const pendencies = rows.flatMap((row) => {
    const result: Array<{
      movementId: number;
      equipmentId: number;
      equipmentCode: string;
      equipmentName: string;
      termType: "responsibility" | "devolution";
      responsibleUserId: string;
      responsibleUserName: string;
      responsibleUserEmail: string | null;
      createdAt: Date;
    }> = [];

    if (row.toHolderType === "user" && row.toUserId && !row.responsibilityTermUrl) {
      result.push({
        movementId: row.movementId,
        equipmentId: row.equipmentId,
        equipmentCode: row.equipmentCode,
        equipmentName: row.equipmentName,
        termType: "responsibility",
        responsibleUserId: row.toUserId,
        responsibleUserName: row.toUserName || row.toUserEmail || "Usuário",
        responsibleUserEmail: row.toUserEmail,
        createdAt: row.createdAt,
      });
    }

    if (row.fromHolderType === "user" && row.fromUserId && !row.devolutionTermUrl) {
      result.push({
        movementId: row.movementId,
        equipmentId: row.equipmentId,
        equipmentCode: row.equipmentCode,
        equipmentName: row.equipmentName,
        termType: "devolution",
        responsibleUserId: row.fromUserId,
        responsibleUserName: row.fromUserName || row.fromUserEmail || "Usuário",
        responsibleUserEmail: row.fromUserEmail,
        createdAt: row.createdAt,
      });
    }

    return result;
  }).filter((pendency) => isAdmin || pendency.responsibleUserId === auth.user.id);

  return NextResponse.json(pendencies);
}
