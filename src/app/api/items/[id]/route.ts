import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, acquisitionItems, acquisitions, stockIssues } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canAdmin, canView } from "@/lib/roles";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;

  const { id } = await params;
  const productId = Number(id);
  const product = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product.length) return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });

  const acqItems = await db.select({
    id: acquisitionItems.id,
    quantity: acquisitionItems.quantity,
    unitPrice: acquisitionItems.unitPrice,
    totalPrice: acquisitionItems.totalPrice,
    date: acquisitions.date,
    createdAt: acquisitions.createdAt,
  }).from(acquisitionItems)
    .innerJoin(acquisitions, eq(acquisitions.id, acquisitionItems.acquisitionId))
    .where(eq(acquisitionItems.productId, productId))
    .orderBy(asc(acquisitions.date), asc(acquisitions.createdAt), asc(acquisitionItems.id));

  const issues = await db.select().from(stockIssues).where(eq(stockIssues.productId, productId)).orderBy(asc(stockIssues.date), asc(stockIssues.createdAt), asc(stockIssues.id));

  type TimelineEntry = { type: "acquisition" | "issue"; date: Date; createdAt: Date; sortId: number; quantity: number };
  const timeline: TimelineEntry[] = [
    ...acqItems.map((a) => ({ type: "acquisition" as const, date: a.date, createdAt: a.createdAt, sortId: a.id, quantity: a.quantity })),
    ...issues.map((i) => ({ type: "issue" as const, date: i.date, createdAt: i.createdAt, sortId: i.id, quantity: i.quantity })),
  ];
  const dayKey = (value: Date) => new Date(value).toISOString().slice(0, 10);
  timeline.sort((a, b) => dayKey(a.date).localeCompare(dayKey(b.date)) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.sortId - b.sortId);

  let balance = 0;
  const balanceMap = new Map<string, number>();
  for (const entry of timeline) {
    balance += entry.type === "acquisition" ? entry.quantity : -entry.quantity;
    balanceMap.set(`${entry.type}-${entry.sortId}`, balance);
  }

  return NextResponse.json({
    item: product[0],
    acquisitionHistory: [...acqItems].reverse().map((a) => ({ ...a, balanceAfter: balanceMap.get(`acquisition-${a.id}`) ?? 0 })),
    issueHistory: [...issues].reverse().map((i) => ({ ...i, itemId: i.productId, balanceAfter: balanceMap.get(`issue-${i.id}`) ?? 0 })),
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, canAdmin);
  if (hasAuthError(auth)) return auth.response;

  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId)) {
    return NextResponse.json({ error: "Produto inválido." }, { status: 400 });
  }

  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  if (!product) {
    return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  }

  const [acquisitionUsage] = await db.select({ id: acquisitionItems.id }).from(acquisitionItems).where(eq(acquisitionItems.productId, productId)).limit(1);
  const [issueUsage] = await db.select({ id: stockIssues.id }).from(stockIssues).where(eq(stockIssues.productId, productId)).limit(1);

  if (acquisitionUsage || issueUsage) {
    return NextResponse.json(
      { error: "Este produto possui histórico de aquisição ou baixa e não pode ser excluído." },
      { status: 409 },
    );
  }

  await db.delete(products).where(eq(products.id, productId));
  return NextResponse.json({ ok: true });
}
