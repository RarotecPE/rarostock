import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { stockCategories, stockUnits } from "@/db/schema";

export async function listStockCatalog(includeInactive = false) {
  const categories = includeInactive
    ? await db
      .select()
      .from(stockCategories)
      .orderBy(asc(stockCategories.name))
    : await db
      .select()
      .from(stockCategories)
      .where(eq(stockCategories.active, true))
      .orderBy(asc(stockCategories.name));

  const units = includeInactive
    ? await db
      .select()
      .from(stockUnits)
      .orderBy(asc(stockUnits.name))
    : await db
      .select()
      .from(stockUnits)
      .where(eq(stockUnits.active, true))
      .orderBy(asc(stockUnits.name));

  return { categories, units };
}

export function normalizeCatalogName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}


export function normalizeActive(value: unknown) {
  return typeof value === "boolean" ? value : true;
}