import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { stockIssues, items, acquisitionItems, acquisitions } from "@/db/schema";
import { eq, sql, gte, lte, and, desc, inArray, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const conditions = [];
  if (startDate) {
    conditions.push(sql`DATE(${stockIssues.date}) >= ${startDate}::date`);
  }
  if (endDate) {
    conditions.push(sql`DATE(${stockIssues.date}) <= ${endDate}::date`);
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const issueRows = await db
    .select({
      id: stockIssues.id,
      itemId: stockIssues.itemId,
      quantity: stockIssues.quantity,
      date: stockIssues.date,
      createdAt: stockIssues.createdAt,
      itemCode: items.code,
      itemName: items.name,
      itemUnit: items.unit,
    })
    .from(stockIssues)
    .innerJoin(items, eq(items.id, stockIssues.itemId))
    .where(whereClause)
    .orderBy(desc(stockIssues.date), desc(stockIssues.createdAt), desc(stockIssues.id));

  if (issueRows.length === 0) {
    return NextResponse.json([]);
  }

  const itemIds = [...new Set(issueRows.map((i) => i.itemId))];

  const acquisitionRows = await db
    .select({
      id: acquisitionItems.id,
      itemId: acquisitionItems.itemId,
      quantity: acquisitionItems.quantity,
      date: acquisitions.date,
      createdAt: acquisitions.createdAt,
    })
    .from(acquisitionItems)
    .innerJoin(acquisitions, eq(acquisitions.id, acquisitionItems.acquisitionId))
    .where(inArray(acquisitionItems.itemId, itemIds))
    .orderBy(asc(acquisitions.createdAt), asc(acquisitionItems.id));

  const allIssueRows = await db
    .select({
      id: stockIssues.id,
      itemId: stockIssues.itemId,
      quantity: stockIssues.quantity,
      date: stockIssues.date,
      createdAt: stockIssues.createdAt,
    })
    .from(stockIssues)
    .where(inArray(stockIssues.itemId, itemIds))
    .orderBy(asc(stockIssues.createdAt), asc(stockIssues.id));

  type TimelineEntry = {
    type: "acquisition" | "issue";
    itemId: number;
    date: Date;
    createdAt: Date;
    sortId: number;
    quantity: number;
  };

  const getDayKey = (value: Date) => {
    const d = new Date(value);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const timeline: TimelineEntry[] = [
    ...acquisitionRows.map((a) => ({
      type: "acquisition" as const,
      itemId: a.itemId,
      date: a.date,
      createdAt: a.createdAt,
      sortId: a.id,
      quantity: a.quantity,
    })),
    ...allIssueRows.map((i) => ({
      type: "issue" as const,
      itemId: i.itemId,
      date: i.date,
      createdAt: i.createdAt,
      sortId: i.id,
      quantity: i.quantity,
    })),
  ].sort((a, b) => {
    const dayCmp = getDayKey(a.date).localeCompare(getDayKey(b.date));
    if (dayCmp !== 0) return dayCmp;

    const createdCmp =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (createdCmp !== 0) return createdCmp;

    return a.sortId - b.sortId;
  });

  const runningBalance = new Map<number, number>();
  const issueBalanceMap = new Map<number, number>();

  for (const entry of timeline) {
    const current = runningBalance.get(entry.itemId) ?? 0;
    const next =
      entry.type === "acquisition"
        ? current + entry.quantity
        : current - entry.quantity;

    runningBalance.set(entry.itemId, next);

    if (entry.type === "issue") {
      issueBalanceMap.set(entry.sortId, next);
    }
  }

  const result = issueRows.map((issue) => ({
    ...issue,
    balanceAfter: issueBalanceMap.get(issue.id) ?? 0,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { itemId, quantity, reason } = body as {
    itemId: number;
    quantity: number;
    reason?: string;
  };
  const now = new Date();

  const item = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
  if (item.length === 0) {
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  }

  if (quantity > item[0].quantity) {
    return NextResponse.json(
      { error: "Quantidade de baixa superior ao saldo atual" },
      { status: 400 }
    );
  }

  if (quantity <= 0) {
    return NextResponse.json(
      { error: "Quantidade deve ser maior que zero" },
      { status: 400 }
    );
  }

  const [issue] = await db
    .insert(stockIssues)
    .values({
      itemId,
      quantity,
      date: now,
      reason: reason || null,
    })
    .returning();

  await db
    .update(items)
    .set({
      quantity: sql`${items.quantity} - ${quantity}`,
      updatedAt: new Date(),
    })
    .where(eq(items.id, itemId));

  return NextResponse.json(issue, { status: 201 });
}
