import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  numeric,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";

export const itemTypeEnum = pgEnum("item_type", [
  "Equipamento",
  "Item de Consumo",
]);

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  type: itemTypeEnum("type").notNull(),
  minimumLimit: integer("minimum_limit"),
  brand: varchar("brand", { length: 100 }),
  additionalUnit: varchar("additional_unit", { length: 50 }),
  observations: text("observations"),
  quantity: integer("quantity").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const acquisitions = pgTable("acquisitions", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  totalValue: numeric("total_value", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  invoiceUrl: text("invoice_url"),
  invoiceFilename: varchar("invoice_filename", { length: 255 }),
  invoiceStoragePath: text("invoice_storage_path"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const acquisitionItems = pgTable("acquisition_items", {
  id: serial("id").primaryKey(),
  acquisitionId: integer("acquisition_id")
    .notNull()
    .references(() => acquisitions.id, { onDelete: "cascade" }),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
});

export const stockIssues = pgTable("stock_issues", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  date: timestamp("date").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
