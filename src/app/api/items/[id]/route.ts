import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { items, acquisitionItems, acquisitions, stockIssues } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const itemId = parseInt(id);

  const item = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
  if (item.length === 0) {
    return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
  }

  // Get acquisition history ordered for visual display
  const acqItems = await db
    .select({
      id: acquisitionItems.id,
      quantity: acquisitionItems.quantity,
      unitPrice: acquisitionItems.unitPrice,
      totalPrice: acquisitionItems.totalPrice,
      date: acquisitions.date,
      createdAt: acquisitions.createdAt,
    })
    .from(acquisitionItems)
    .innerJoin(acquisitions, eq(acquisitions.id, acquisitionItems.acquisitionId))
    .where(eq(acquisitionItems.itemId, itemId))
    .orderBy(asc(acquisitions.date), asc(acquisitions.createdAt), asc(acquisitionItems.id));

  // Get stock issues ordered for visual display
  const issues = await db
    .select()
    .from(stockIssues)
    .where(eq(stockIssues.itemId, itemId))
    .orderBy(asc(stockIssues.date), asc(stockIssues.createdAt), asc(stockIssues.id));

  // Build combined timeline to compute running balance
  type TimelineEntry = {
    type: "acquisition" | "issue";
    date: Date;
    createdAt: Date;
    sortId: number;
    quantity: number;
  };

  const timeline: TimelineEntry[] = [];
  for (const a of acqItems) {
    timeline.push({
      type: "acquisition",
      date: a.date,
      createdAt: a.createdAt,
      sortId: a.id,
      quantity: a.quantity,
    });
  }
  for (const i of issues) {
    timeline.push({
      type: "issue",
      date: i.date,
      createdAt: i.createdAt,
      sortId: i.id,
      quantity: i.quantity,
    });
  }
  // Balance must respect the chronological order of the transaction date.
  // When multiple movements happen on the same calendar day, use createdAt
  // only as a tie-breaker to preserve a consistent order.
  const getDayKey = (value: Date) => {
    const d = new Date(value);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  timeline.sort((a, b) => {
    const dayCmp = getDayKey(a.date).localeCompare(getDayKey(b.date));
    if (dayCmp !== 0) return dayCmp;

    const createdAtCmp =
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (createdAtCmp !== 0) return createdAtCmp;

    return a.sortId - b.sortId;
  });

  // Calculate running balance
  let balance = 0;
  const balanceMap = new Map<string, number>(); // key: "type-sortId"
  for (const entry of timeline) {
    if (entry.type === "acquisition") {
      balance += entry.quantity;
    } else {
      balance -= entry.quantity;
    }
    balanceMap.set(`${entry.type}-${entry.sortId}`, balance);
  }

  // Attach balance to acquisition items (return descending for display)
  const acqWithBalance = [...acqItems].reverse().map((a) => ({
    ...a,
    balanceAfter: balanceMap.get(`acquisition-${a.id}`) ?? 0,
  }));

  // Attach balance to issues (return descending for display)
  const issuesWithBalance = [...issues].reverse().map((i) => ({
    ...i,
    balanceAfter: balanceMap.get(`issue-${i.id}`) ?? 0,
  }));

  return NextResponse.json({
    item: item[0],
    acquisitionHistory: acqWithBalance,
    issueHistory: issuesWithBalance,
  });
}
