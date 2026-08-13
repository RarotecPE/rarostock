import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  numeric,
  timestamp,
  pgEnum,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";

export const itemTypeEnum = pgEnum("item_type", [
  "Equipamento",
  "Item de Consumo",
]);

export const equipmentHolderTypeEnum = pgEnum("equipment_holder_type", [
  "company",
  "user",
]);

export const equipmentRequestStatusEnum = pgEnum("equipment_request_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const equipmentRequestTypeEnum = pgEnum("equipment_request_type", [
  "obtain",
  "transfer",
]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  minimumLimit: integer("minimum_limit").notNull(),
  desiredLimit: integer("desired_limit").notNull(),
  brand: varchar("brand", { length: 100 }),
  additionalUnit: varchar("additional_unit", { length: 50 }),
  observations: text("observations"),
  quantity: integer("quantity").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Legacy table kept for historical data that existed before products/equipments were split.
export const legacyItems = pgTable("items", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  type: itemTypeEnum("type").notNull(),
  minimumLimit: integer("minimum_limit"),
  desiredLimit: integer("desired_limit"),
  brand: varchar("brand", { length: 100 }),
  additionalUnit: varchar("additional_unit", { length: 50 }),
  observations: text("observations"),
  quantity: integer("quantity").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const items = products;

export const acquisitions = pgTable("acquisitions", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  totalValue: numeric("total_value", { precision: 12, scale: 2 })
    .notNull()
    .default("0"),
  purchaseType: varchar("purchase_type", { length: 20 }).notNull().default("physical_store"),
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
  productId: integer("item_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
});

export const stockIssues = pgTable("stock_issues", {
  id: serial("id").primaryKey(),
  productId: integer("item_id").notNull(),
  quantity: integer("quantity").notNull(),
  date: timestamp("date").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stockCategories = pgTable("stock_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const stockUnits = pgTable("stock_units", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  pluralName: varchar("plural_name", { length: 50 }).notNull(),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const equipmentCategories = pgTable("equipment_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const equipments = pgTable("equipments", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  category: varchar("category", { length: 100 }).notNull(),
  price: numeric("price", { precision: 12, scale: 2 }),
  invoiceUrl: text("invoice_url"),
  invoiceFilename: varchar("invoice_filename", { length: 255 }),
  invoiceStoragePath: text("invoice_storage_path"),
  requiresResponsibilityTerm: boolean("requires_responsibility_term").notNull().default(false),
  observations: text("observations"),
  holderType: equipmentHolderTypeEnum("holder_type").notNull().default("company"),
  holderUserId: uuid("holder_user_id"),
  holderUserName: varchar("holder_user_name", { length: 255 }),
  holderUserEmail: varchar("holder_user_email", { length: 255 }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const equipmentRequests = pgTable("equipment_requests", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipments.id, { onDelete: "cascade" }),
  type: equipmentRequestTypeEnum("type").notNull(),
  status: equipmentRequestStatusEnum("status").notNull().default("pending"),
  requesterUserId: uuid("requester_user_id").notNull(),
  requesterName: varchar("requester_name", { length: 255 }).notNull(),
  requesterEmail: varchar("requester_email", { length: 255 }).notNull(),
  fromHolderType: equipmentHolderTypeEnum("from_holder_type").notNull(),
  fromUserId: uuid("from_user_id"),
  fromUserName: varchar("from_user_name", { length: 255 }),
  fromUserEmail: varchar("from_user_email", { length: 255 }),
  toHolderType: equipmentHolderTypeEnum("to_holder_type").notNull(),
  toUserId: uuid("to_user_id"),
  toUserName: varchar("to_user_name", { length: 255 }),
  toUserEmail: varchar("to_user_email", { length: 255 }),
  reason: text("reason"),
  decidedByUserId: uuid("decided_by_user_id"),
  decidedAt: timestamp("decided_at"),
  decisionNote: text("decision_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const equipmentMovements = pgTable("equipment_movements", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull().references(() => equipments.id, { onDelete: "cascade" }),
  fromHolderType: equipmentHolderTypeEnum("from_holder_type").notNull(),
  fromUserId: uuid("from_user_id"),
  fromUserName: varchar("from_user_name", { length: 255 }),
  fromUserEmail: varchar("from_user_email", { length: 255 }),
  toHolderType: equipmentHolderTypeEnum("to_holder_type").notNull(),
  toUserId: uuid("to_user_id"),
  toUserName: varchar("to_user_name", { length: 255 }),
  toUserEmail: varchar("to_user_email", { length: 255 }),
  reason: text("reason"),
  requestId: integer("request_id"),
  createdByUserId: uuid("created_by_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});



