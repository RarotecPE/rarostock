export { pluralizeUnit } from "@/lib/stock-catalog";
export type { StockCatalog, StockCategoryOption, StockUnitOption } from "@/lib/stock-catalog";

export type StockStatus =
  | "Em Estoque"
  | "Abaixo do Desejável"
  | "Abaixo do Mínimo"
  | "Indisponível";

export interface Item {
  id: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  minimumLimit: number;
  desiredLimit: number;
  brand: string | null;
  additionalUnit: string | null;
  observations: string | null;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export type Product = Item;

export interface Acquisition {
  id: number;
  date: Date;
  totalValue: string;
  invoiceUrl: string | null;
  invoiceFilename: string | null;
  invoiceStoragePath: string | null;
  createdAt: Date;
}

export interface AcquisitionItem {
  id: number;
  acquisitionId: number;
  productId: number;
  itemId: number;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

export interface AcquisitionItemWithDetails extends AcquisitionItem {
  itemName: string;
  itemCode: string;
  itemUnit: string;
}

export interface StockIssue {
  id: number;
  productId: number;
  itemId: number;
  quantity: number;
  date: Date;
  reason: string | null;
  createdAt: Date;
}

export interface CartItem {
  itemId: number;
  itemName: string;
  itemCode: string;
  itemUnit: string;
  quantity: number;
  unitPrice: number;
}

export interface PriceHistoryPoint {
  date: string;
  unitPrice: number;
}

export type EquipmentHolderType = "company" | "user";
export type EquipmentRequestType = "obtain" | "transfer";
export type EquipmentRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface EquipmentUser {
  id: string;
  nome: string;
  email: string;
  avatar_url?: string | null;
}

export interface Equipment {
  id: number;
  code: string;
  name: string;
  brand: string | null;
  category: string;
  price: string | null;
  invoiceUrl: string | null;
  invoiceFilename: string | null;
  invoiceStoragePath: string | null;
  observations: string | null;
  holderType: EquipmentHolderType;
  holderUserId: string | null;
  holderUserName: string | null;
  holderUserEmail: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EquipmentMovement {
  id: number;
  equipmentId: number;
  equipmentCode: string;
  equipmentName: string;
  equipmentCategory: string;
  fromHolderType: EquipmentHolderType;
  fromUserId: string | null;
  fromUserName: string | null;
  fromUserEmail: string | null;
  toHolderType: EquipmentHolderType;
  toUserId: string | null;
  toUserName: string | null;
  toUserEmail: string | null;
  reason: string | null;
  requestId: number | null;
  createdByUserId: string | null;
  createdAt: string | Date;
}
export interface EquipmentRequest {
  id: number;
  equipmentId: number;
  type: EquipmentRequestType;
  status: EquipmentRequestStatus;
  requesterUserId: string;
  requesterName: string;
  requesterEmail: string;
  fromHolderType: EquipmentHolderType;
  fromUserId: string | null;
  fromUserName: string | null;
  fromUserEmail: string | null;
  toHolderType: EquipmentHolderType;
  toUserId: string | null;
  toUserName: string | null;
  toUserEmail: string | null;
  reason: string | null;
  decidedByUserId: string | null;
  decidedAt: Date | null;
  decisionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  equipmentCode?: string;
  equipmentName?: string;
}

export function getStockStatus(
  quantity: number,
  minimumLimit: number | null,
  desiredLimit: number | null = null,
): StockStatus {
  if (quantity === 0) return "Indisponível";
  if (minimumLimit !== null && quantity < minimumLimit) return "Abaixo do Mínimo";
  if (desiredLimit !== null && quantity < desiredLimit) return "Abaixo do Desejável";
  return "Em Estoque";
}

export function formatLimit(limit: number | null): string {
  return limit === null ? "—" : String(limit);
}

export const formatMinimumLimit = formatLimit;

export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function holderLabel(equipment: Pick<Equipment, "holderType" | "holderUserName" | "holderUserEmail">) {
  if (equipment.holderType === "company") return "RAROTEC";
  return equipment.holderUserName || equipment.holderUserEmail || "Usuário";
}
