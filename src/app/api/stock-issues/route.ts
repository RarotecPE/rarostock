import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stockIssues, products, acquisitionItems, acquisitions } from "@/db/schema";
import { eq, sql, and, desc, inArray, asc } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canManageStock, canView } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;

  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const conditions = [];
  if (startDate) conditions.push(sql`DATE(${stockIssues.date}) >= ${startDate}::date`);
  if (endDate) conditions.push(sql`DATE(${stockIssues.date}) <= ${endDate}::date`);

  const issueRows = await db.select({
    id: stockIssues.id,
    itemId: stockIssues.productId,
    productId: stockIssues.productId,
    quantity: stockIssues.quantity,
    date: stockIssues.date,
    createdAt: stockIssues.createdAt,
    itemCode: products.code,
    itemName: products.name,
    itemUnit: products.unit,
  }).from(stockIssues)
    .innerJoin(products, eq(products.id, stockIssues.productId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(stockIssues.date), desc(stockIssues.createdAt), desc(stockIssues.id));

  if (issueRows.length === 0) return NextResponse.json([]);
  const productIds = [...new Set(issueRows.map((i) => i.productId))];

  const acquisitionRows = await db.select({
    id: acquisitionItems.id,
    productId: acquisitionItems.productId,
    quantity: acquisitionItems.quantity,
    date: acquisitions.date,
    createdAt: acquisitions.createdAt,
  }).from(acquisitionItems)
    .innerJoin(acquisitions, eq(acquisitions.id, acquisitionItems.acquisitionId))
    .where(inArray(acquisitionItems.productId, productIds))
    .orderBy(asc(acquisitions.createdAt), asc(acquisitionItems.id));

  const allIssueRows = await db.select({
    id: stockIssues.id,
    productId: stockIssues.productId,
    quantity: stockIssues.quantity,
    date: stockIssues.date,
    createdAt: stockIssues.createdAt,
  }).from(stockIssues)
    .where(inArray(stockIssues.productId, productIds))
    .orderBy(asc(stockIssues.createdAt), asc(stockIssues.id));

  type TimelineEntry = { type: "acquisition" | "issue"; productId: number; date: Date; createdAt: Date; sortId: number; quantity: number };
  const dayKey = (value: Date) => new Date(value).toISOString().slice(0, 10);
  const timeline: TimelineEntry[] = [
    ...acquisitionRows.map((a) => ({ type: "acquisition" as const, productId: a.productId, date: a.date, createdAt: a.createdAt, sortId: a.id, quantity: a.quantity })),
    ...allIssueRows.map((i) => ({ type: "issue" as const, productId: i.productId, date: i.date, createdAt: i.createdAt, sortId: i.id, quantity: i.quantity })),
  ].sort((a, b) => dayKey(a.date).localeCompare(dayKey(b.date)) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.sortId - b.sortId);

  const runningBalance = new Map<number, number>();
  const issueBalanceMap = new Map<number, number>();
  for (const entry of timeline) {
    const current = runningBalance.get(entry.productId) ?? 0;
    const next = entry.type === "acquisition" ? current + entry.quantity : current - entry.quantity;
    runningBalance.set(entry.productId, next);
    if (entry.type === "issue") issueBalanceMap.set(entry.sortId, next);
  }

  return NextResponse.json(issueRows.map((issue) => ({ ...issue, balanceAfter: issueBalanceMap.get(issue.id) ?? 0 })));
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, canManageStock);
  if (hasAuthError(auth)) return auth.response;

  const body = await req.json();
  const itemId = Number(body.itemId);
  const quantity = Number(body.quantity);
  const reason = typeof body.reason === "string" ? body.reason : null;

  const product = await db.select().from(products).where(eq(products.id, itemId)).limit(1);
  if (!product.length) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  if (!Number.isInteger(quantity) || quantity <= 0) return NextResponse.json({ error: "Quantidade deve ser maior que zero." }, { status: 400 });
  if (quantity > product[0].quantity) return NextResponse.json({ error: "Quantidade de baixa superior ao saldo atual." }, { status: 400 });

  const [issue] = await db.insert(stockIssues).values({ productId: itemId, quantity, date: new Date(), reason }).returning();
  await db.update(products).set({ quantity: sql`${products.quantity} - ${quantity}`, updatedAt: new Date() }).where(eq(products.id, itemId));
  return NextResponse.json(issue, { status: 201 });
}
