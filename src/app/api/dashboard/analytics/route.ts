import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { acquisitions, acquisitionItems, items, stockIssues } from "@/db/schema";
import { eq, gte } from "drizzle-orm";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canView } from "@/lib/roles";

type MonthBucket = {
  key: string;
  month: string;
  entradas: number;
  baixas: number;
  valor: number;
};

const MONTH_NAMES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const getMonthKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const buildMonthBuckets = () => {
  const current = new Date();
  const start = new Date(current.getFullYear(), current.getMonth() - 11, 1);
  const buckets: MonthBucket[] = [];

  for (let index = 0; index < 12; index += 1) {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    buckets.push({
      key: getMonthKey(date),
      month: `${MONTH_NAMES[date.getMonth()]}/${String(date.getFullYear()).slice(-2)}`,
      entradas: 0,
      baixas: 0,
      valor: 0,
    });
  }

  return {
    start,
    buckets,
    byKey: new Map(buckets.map((bucket) => [bucket.key, bucket])),
  };
};

const getStockStatus = (quantity: number, minimumLimit: number | null) => {
  if (quantity === 0) return "Indisponivel";
  if (minimumLimit !== null && quantity < minimumLimit) return "Abaixo do Minimo";
  return "Em Estoque";
};

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, canView);
  if (hasAuthError(auth)) return auth.response;

  const { start, buckets, byKey } = buildMonthBuckets();

  const [allItems, purchaseRows, issueRows, acquisitionTotals] = await Promise.all([
    db.select().from(items),
    db
      .select({
        date: acquisitions.date,
        totalValue: acquisitions.totalValue,
        itemId: acquisitionItems.itemId,
        itemCode: items.code,
        itemName: items.name,
        quantity: acquisitionItems.quantity,
      })
      .from(acquisitionItems)
      .innerJoin(acquisitions, eq(acquisitions.id, acquisitionItems.acquisitionId))
      .innerJoin(items, eq(items.id, acquisitionItems.itemId))
      .where(gte(acquisitions.date, start)),
    db
      .select({
        date: stockIssues.date,
        itemId: stockIssues.itemId,
        itemCode: items.code,
        itemName: items.name,
        quantity: stockIssues.quantity,
      })
      .from(stockIssues)
      .innerJoin(items, eq(items.id, stockIssues.itemId))
      .where(gte(stockIssues.date, start)),
    db
      .select({
        id: acquisitions.id,
        date: acquisitions.date,
        totalValue: acquisitions.totalValue,
      })
      .from(acquisitions)
      .where(gte(acquisitions.date, start)),
  ]);

  const purchasedByItem = new Map<
    number,
    { code: string; name: string; quantity: number }
  >();
  const issuedByItem = new Map<
    number,
    { code: string; name: string; quantity: number }
  >();

  for (const row of purchaseRows) {
    const bucket = byKey.get(getMonthKey(new Date(row.date)));
    if (!bucket) continue;

    bucket.entradas += row.quantity;

    const current = purchasedByItem.get(row.itemId) ?? {
      code: row.itemCode,
      name: row.itemName,
      quantity: 0,
    };
    current.quantity += row.quantity;
    purchasedByItem.set(row.itemId, current);
  }

  for (const acquisition of acquisitionTotals) {
    const bucket = byKey.get(getMonthKey(new Date(acquisition.date)));
    if (!bucket) continue;
    bucket.valor += Number(acquisition.totalValue);
  }

  for (const row of issueRows) {
    const bucket = byKey.get(getMonthKey(new Date(row.date)));
    if (!bucket) continue;

    bucket.baixas += row.quantity;

    const current = issuedByItem.get(row.itemId) ?? {
      code: row.itemCode,
      name: row.itemName,
      quantity: 0,
    };
    current.quantity += row.quantity;
    issuedByItem.set(row.itemId, current);
  }

  const statusCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();

  for (const item of allItems) {
    const status = getStockStatus(item.quantity, item.minimumLimit);
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);
    categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
  }

  const topItems = (
    source: Map<number, { code: string; name: string; quantity: number }>
  ) =>
    [...source.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

  return NextResponse.json({
    monthlyFlow: buckets.map(({ month, entradas, baixas }) => ({
      month,
      entradas,
      baixas,
    })),
    monthlyAcquisitionValue: buckets.map(({ month, valor }) => ({
      month,
      valor: Number(valor.toFixed(2)),
    })),
    topIssuedProducts: topItems(issuedByItem),
    topPurchasedProducts: topItems(purchasedByItem),
    stockStatus: [
      { name: "Em Estoque", value: statusCounts.get("Em Estoque") ?? 0 },
      { name: "Abaixo do Minimo", value: statusCounts.get("Abaixo do Minimo") ?? 0 },
      { name: "Indisponivel", value: statusCounts.get("Indisponivel") ?? 0 },
    ],
    categoryDistribution: [...categoryCounts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
  });
}

