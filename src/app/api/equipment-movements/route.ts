import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { equipmentMovements, equipments } from "@/db/schema";
import { and, desc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canAdmin, canView } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const equipmentIds = url.searchParams.getAll("equipmentId").map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0);
  const userIds = url.searchParams.getAll("userId").filter(Boolean);
  const isAdmin = canAdmin(auth.role);
  const conditions = [];

  if (startDate) conditions.push(gte(equipmentMovements.createdAt, new Date(`${startDate}T00:00:00`)));
  if (endDate) conditions.push(lte(equipmentMovements.createdAt, new Date(`${endDate}T23:59:59.999`)));
  if (equipmentIds.length === 1) conditions.push(eq(equipmentMovements.equipmentId, equipmentIds[0]));
  if (equipmentIds.length > 1) conditions.push(inArray(equipmentMovements.equipmentId, equipmentIds));

  if (isAdmin && userIds.length) {
    conditions.push(or(
      inArray(equipmentMovements.fromUserId, userIds),
      inArray(equipmentMovements.toUserId, userIds),
      inArray(equipmentMovements.createdByUserId, userIds),
    )!);
  } else if (!isAdmin) {
    conditions.push(or(
      eq(equipmentMovements.fromUserId, auth.user.id),
      eq(equipmentMovements.toUserId, auth.user.id),
      eq(equipmentMovements.createdByUserId, auth.user.id),
    )!);
  }

  const rows = await db.select({
    id: equipmentMovements.id,
    equipmentId: equipmentMovements.equipmentId,
    equipmentCode: equipments.code,
    equipmentName: equipments.name,
    equipmentCategory: equipments.category,
    fromHolderType: equipmentMovements.fromHolderType,
    fromUserId: equipmentMovements.fromUserId,
    fromUserName: equipmentMovements.fromUserName,
    fromUserEmail: equipmentMovements.fromUserEmail,
    toHolderType: equipmentMovements.toHolderType,
    toUserId: equipmentMovements.toUserId,
    toUserName: equipmentMovements.toUserName,
    toUserEmail: equipmentMovements.toUserEmail,
    reason: equipmentMovements.reason,
    requestId: equipmentMovements.requestId,
    createdByUserId: equipmentMovements.createdByUserId,
    createdAt: equipmentMovements.createdAt,
  }).from(equipmentMovements)
    .innerJoin(equipments, eq(equipments.id, equipmentMovements.equipmentId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(equipmentMovements.createdAt), desc(equipmentMovements.id));

  return NextResponse.json(rows);
}
