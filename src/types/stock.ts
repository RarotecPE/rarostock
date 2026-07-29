export type ItemType = "Equipamento" | "Item de Consumo";

export type StockStatus = "Em Estoque" | "Abaixo do Mínimo" | "Indisponível";

export interface Item {
  id: number;
  code: string;
  name: string;
  category: string;
  unit: string;
  type: ItemType;
  minimumLimit: number | null;
  brand: string | null;
  additionalUnit: string | null;
  observations: string | null;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

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

export function getStockStatus(
  quantity: number,
  minimumLimit: number | null
): StockStatus {
  if (quantity === 0) return "Indisponível";
  if (minimumLimit !== null && quantity < minimumLimit) return "Abaixo do Mínimo";
  return "Em Estoque";
}

export function formatMinimumLimit(minimumLimit: number | null): string {
  return minimumLimit === null ? "—" : String(minimumLimit);
}

export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const PLURAL_MAP: Record<string, string> = {
  "Unidade": "Unidades",
  "Pacote": "Pacotes",
  "Caixa": "Caixas",
  "Litro": "Litros",
  "Resma": "Resmas",
  "Rolo": "Rolos",
  "Galão": "Galões",
  "Fardo": "Fardos",
};

export function pluralizeUnit(unit: string, quantity: number): string {
  if (quantity === 1 || quantity === -1) return unit;
  return PLURAL_MAP[unit] ?? unit;
}

export const CATEGORIES = [
  "Computador",
  "Monitor",
  "Periféricos",
  "Infraestrutura",
  "Mobiliário",
  "Suprimento Geral",
  "Suprimento de TI",
  "Outro",
] as const;

export const UNITS = [
  "Unidade",
  "Pacote",
  "Caixa",
  "Litro",
  "Kg",
  "Resma",
  "Rolo",
  "Galão",
  "Fardo",
] as const;


