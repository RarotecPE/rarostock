import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { acquisitions, acquisitionItems, items } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canView } from "@/lib/roles";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;

  const { id } = await params;
  const acqId = parseInt(id);

  const acq = await db
    .select()
    .from(acquisitions)
    .where(eq(acquisitions.id, acqId))
    .limit(1);

  if (acq.length === 0) {
    return NextResponse.json(
      { error: "Aquisição não encontrada" },
      { status: 404 }
    );
  }

  const acqItems = await db
    .select({
      id: acquisitionItems.id,
      acquisitionId: acquisitionItems.acquisitionId,
      itemId: acquisitionItems.itemId,
      quantity: acquisitionItems.quantity,
      unitPrice: acquisitionItems.unitPrice,
      totalPrice: acquisitionItems.totalPrice,
      itemName: items.name,
      itemCode: items.code,
      itemUnit: items.unit,
    })
    .from(acquisitionItems)
    .innerJoin(items, eq(items.id, acquisitionItems.itemId))
    .where(eq(acquisitionItems.acquisitionId, acqId));

  return NextResponse.json({
    acquisition: acq[0],
    items: acqItems,
  });
}
