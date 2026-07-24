import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { items } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const allItems = await db.select().from(items).orderBy(desc(items.createdAt));
  return NextResponse.json(allItems);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Generate code RST-XXXX
  const lastItem = await db
    .select({ code: items.code })
    .from(items)
    .orderBy(desc(items.id))
    .limit(1);

  let nextNum = 1;
  if (lastItem.length > 0) {
    const match = lastItem[0].code.match(/RST-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const code = `RST-${String(nextNum).padStart(4, "0")}`;

  const result = await db
    .insert(items)
    .values({
      code,
      name: body.name,
      category: body.category,
      unit: body.unit,
      type: body.type,
      minimumLimit:
        body.type === "Equipamento" ? null : (body.minimumLimit ?? 0),
      brand: body.brand || null,
      additionalUnit: body.additionalUnit || null,
      observations: body.observations || null,
      quantity: 0,
    })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;

  // Remove type from updates - cannot be changed
  delete updates.type;
  delete updates.quantity;
  delete updates.code;

  updates.updatedAt = new Date();

  const result = await db
    .update(items)
    .set(updates)
    .where(eq(items.id, id))
    .returning();

  return NextResponse.json(result[0]);
}
