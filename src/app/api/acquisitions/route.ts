import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { acquisitions, acquisitionItems, products } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canManageStock, canView } from "@/lib/roles";
import { auditClient, getRequestContext } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const conditions = [];
  if (startDate) conditions.push(sql`DATE(${acquisitions.date}) >= ${startDate}::date`);
  if (endDate) conditions.push(sql`DATE(${acquisitions.date}) <= ${endDate}::date`);

  const allAcquisitions = await db.select().from(acquisitions).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(acquisitions.date));
  return NextResponse.json(allAcquisitions);
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, canManageStock);
  if (hasAuthError(auth)) return auth.response;

  const body = await req.json();
  const { date, purchaseType = "physical_store", invoiceUrl, invoiceFilename, invoiceStoragePath, cartItems } = body as {
    date: string;
    purchaseType?: string;
    invoiceUrl?: string;
    invoiceFilename?: string;
    invoiceStoragePath?: string;
    cartItems: Array<{ itemId: number; quantity: number; unitPrice: number }>;
  };

  if (!["physical_store", "online"].includes(purchaseType)) {
    return NextResponse.json({ error: "Tipo de compra inválido." }, { status: 400 });
  }

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return NextResponse.json({ error: "Informe ao menos um produto." }, { status: 400 });
  }

  const productIds = cartItems.map((item) => item.itemId);
  const validProducts = await db.select({ id: products.id, code: products.code, name: products.name }).from(products);
  const validProductMap = new Map(validProducts.map((item) => [item.id, item]));
  if (productIds.some((id) => !validProductMap.has(id))) {
    return NextResponse.json({ error: "A aquisição só pode conter produtos cadastrados." }, { status: 400 });
  }

  const acq = await db.transaction(async (tx) => {
    const totalValue = cartItems.reduce((sum, ci) => sum + ci.quantity * ci.unitPrice, 0);
    const [createdAcquisition] = await tx.insert(acquisitions).values({
      date: new Date(date),
      totalValue: totalValue.toFixed(2),
      purchaseType,
      invoiceUrl: invoiceUrl || null,
      invoiceFilename: invoiceFilename || null,
      invoiceStoragePath: invoiceStoragePath || null,
    }).returning();

    for (const ci of cartItems) {
      const lineTotal = ci.quantity * ci.unitPrice;
      await tx.insert(acquisitionItems).values({
        acquisitionId: createdAcquisition.id,
        productId: ci.itemId,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice.toFixed(2),
        totalPrice: lineTotal.toFixed(2),
      });
      await tx.update(products).set({
        quantity: sql`${products.quantity} + ${ci.quantity}`,
        updatedAt: new Date(),
      }).where(eq(products.id, ci.itemId));
    }

    return createdAcquisition;
  });

  auditClient.log({
    system: "rarostock",
    category: "inventory",
    action: "stock.acquisition",
    severity: "INFO",
    status: "SUCCESS",
    actor: {
      type: "user",
      userId: auth.user.id,
      name: auth.user.nome,
      email: auth.user.email,
      role: auth.role,
    },
    targets: cartItems.map((ci) => {
      const prod = validProductMap.get(ci.itemId);
      return {
        type: "product",
        id: String(ci.itemId),
        label: prod ? `${prod.code} - ${prod.name}` : `Product #${ci.itemId}`,
      };
    }),
    context: getRequestContext(req),
    details: {
      acquisitionId: acq.id,
      date,
      purchaseType,
      itemCount: cartItems.length,
      items: cartItems.map((ci) => {
        const prod = validProductMap.get(ci.itemId);
        return {
          itemId: ci.itemId,
          productCode: prod?.code,
          productName: prod?.name,
          quantity: ci.quantity,
          unitPrice: ci.unitPrice,
        };
      }),
    },
  });

  return NextResponse.json(acq, { status: 201 });
}
