import { and, eq, notInArray } from "drizzle-orm";
import { db } from "@/db";
import { equipmentRequests } from "@/db/schema";

type CancelPendingEquipmentRequestsInput = {
  equipmentId: number;
  previousHolderUserId: string;
  decidedByUserId: string;
  exceptRequestIds?: number[];
  note?: string;
};

export async function cancelPendingEquipmentRequestsForHolderChange({
  equipmentId,
  previousHolderUserId,
  decidedByUserId,
  exceptRequestIds = [],
  note = "Anulada automaticamente porque o equipamento foi devolvido ou transferido.",
}: CancelPendingEquipmentRequestsInput) {
  const conditions = [
    eq(equipmentRequests.equipmentId, equipmentId),
    eq(equipmentRequests.status, "pending"),
    eq(equipmentRequests.fromHolderType, "user"),
    eq(equipmentRequests.fromUserId, previousHolderUserId),
  ];

  if (exceptRequestIds.length) {
    conditions.push(notInArray(equipmentRequests.id, exceptRequestIds));
  }

  return db.update(equipmentRequests).set({
    status: "cancelled",
    decidedByUserId,
    decidedAt: new Date(),
    decisionNote: note,
    updatedAt: new Date(),
  }).where(and(...conditions)).returning();
}
