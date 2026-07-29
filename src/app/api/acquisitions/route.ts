import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { acquisitions, acquisitionItems, items } from "@/db/schema";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canManageStock, canView } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const auth = requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const conditions = [];
  if (startDate) {
    conditions.push(sql`DATE(${acquisitions.date}) >= ${startDate}::date`);
  }
  if (endDate) {
    conditions.push(sql`DATE(${acquisitions.date}) <= ${endDate}::date`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const allAcquisitions = await db
    .select()
    .from(acquisitions)
    .where(whereClause)
    .orderBy(desc(acquisitions.date));

  return NextResponse.json(allAcquisitions);
}

export async function POST(req: NextRequest) {
  const auth = requirePermission(req, canManageStock);
  if (hasAuthError(auth)) return auth.response;

  const body = await req.json();
  const { date, invoiceUrl, invoiceFilename, invoiceStoragePath, cartItems } = body as {
    date: string;
    invoiceUrl?: string;
    invoiceFilename?: string;
    invoiceStoragePath?: string;
    cartItems: Array<{
      itemId: number;
      quantity: number;
      unitPrice: number;
    }>;
  };

  // Do NOT merge duplicates - keep as separate instances
  // Calculate total
  const totalValue = cartItems.reduce(
    (sum, ci) => sum + ci.quantity * ci.unitPrice,
    0
  );

  // Insert acquisition
  const [acq] = await db
    .insert(acquisitions)
    .values({
      date: new Date(date),
      totalValue: totalValue.toFixed(2),
      invoiceUrl: invoiceUrl || null,
      invoiceFilename: invoiceFilename || null,
      invoiceStoragePath: invoiceStoragePath || null,
    })
    .returning();

  // Insert acquisition items and update stock
  for (const ci of cartItems) {
    const lineTotal = ci.quantity * ci.unitPrice;
    await db.insert(acquisitionItems).values({
      acquisitionId: acq.id,
      itemId: ci.itemId,
      quantity: ci.quantity,
      unitPrice: ci.unitPrice.toFixed(2),
      totalPrice: lineTotal.toFixed(2),
    });

    // Update item quantity
    await db
      .update(items)
      .set({
        quantity: sql`${items.quantity} + ${ci.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(items.id, ci.itemId));
  }

  return NextResponse.json(acq, { status: 201 });
}
