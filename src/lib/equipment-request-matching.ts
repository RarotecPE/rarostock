import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { equipmentMovements, equipmentRequests, equipments } from "@/db/schema";

type EquipmentRequest = typeof equipmentRequests.$inferSelect;

export async function autoMatchEquipmentRequest(
  request: EquipmentRequest,
  decidedByUserId: string,
) {
  if (
    request.status !== "pending" ||
    request.fromHolderType !== "user" ||
    request.toHolderType !== "user" ||
    !request.fromUserId ||
    !request.toUserId
  ) {
    return null;
  }

  const fromUserId = request.fromUserId;
  const toUserId = request.toUserId;
  const oppositeType = request.type === "obtain" ? "transfer" : "obtain";

  return db.transaction(async (tx) => {
    const [counterpart] = await tx
      .select()
      .from(equipmentRequests)
      .where(
        and(
          eq(equipmentRequests.equipmentId, request.equipmentId),
          eq(equipmentRequests.status, "pending"),
          eq(equipmentRequests.type, oppositeType),
          eq(equipmentRequests.fromHolderType, "user"),
          eq(equipmentRequests.toHolderType, "user"),
          eq(equipmentRequests.fromUserId, fromUserId),
          eq(equipmentRequests.toUserId, toUserId),
        ),
      )
      .limit(1);

    if (!counterpart) return null;

    const now = new Date();
    const note = "Aprovada automaticamente por confrontamento de solicitações.";

    const updatedRequests = await tx.update(equipmentRequests).set({
      status: "approved",
      decidedByUserId,
      decidedAt: now,
      decisionNote: note,
      updatedAt: now,
    }).where(inArray(equipmentRequests.id, [request.id, counterpart.id])).returning();

    const [equipment] = await tx.update(equipments).set({
      holderType: request.toHolderType,
      holderUserId: toUserId,
      holderUserName: request.toUserName,
      holderUserEmail: request.toUserEmail,
      updatedAt: now,
    }).where(eq(equipments.id, request.equipmentId)).returning();

    const obtainRequest = request.type === "obtain" ? request : counterpart;
    const transferRequest = request.type === "transfer" ? request : counterpart;

    await tx.insert(equipmentMovements).values({
      equipmentId: request.equipmentId,
      fromHolderType: request.fromHolderType,
      fromUserId,
      fromUserName: request.fromUserName,
      fromUserEmail: request.fromUserEmail,
      toHolderType: request.toHolderType,
      toUserId,
      toUserName: request.toUserName,
      toUserEmail: request.toUserEmail,
      reason: request.reason || counterpart.reason || note,
      requestId: request.id,
      createdByUserId: decidedByUserId,
      responsibilityTermUrl: obtainRequest.responsibilityTermUrl,
      responsibilityTermFilename: obtainRequest.responsibilityTermFilename,
      responsibilityTermStoragePath: obtainRequest.responsibilityTermStoragePath,
      devolutionTermUrl: transferRequest.devolutionTermUrl,
      devolutionTermFilename: transferRequest.devolutionTermFilename,
      devolutionTermStoragePath: transferRequest.devolutionTermStoragePath,
    });

    return {
      request: updatedRequests.find((item) => item.id === request.id) ?? request,
      matchedRequest: updatedRequests.find((item) => item.id === counterpart.id) ?? counterpart,
      equipment,
    };
  });
}

