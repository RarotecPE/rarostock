export type StockCategoryOption = {
  id: number;
  name: string;
  active: boolean;
};

export type StockUnitOption = {
  id: number;
  name: string;
  pluralName: string;
  active: boolean;
};

export type StockCatalog = {
  categories: StockCategoryOption[];
  units: StockUnitOption[];
};

export const emptyStockCatalog: StockCatalog = {
  categories: [],
  units: [],
};

export function pluralizeUnit(unit: string, quantity: number, units: StockUnitOption[] = []): string {
  if (quantity === 1 || quantity === -1) return unit;
  return units.find((item) => item.name === unit)?.pluralName || unit;
}

export function includeCurrentCategory(categories: StockCategoryOption[], current: string | null | undefined) {
  if (!current || categories.some((category) => category.name === current)) return categories;
  return [
    ...categories,
    { id: 0, name: current, active: false },
  ];
}

export function includeCurrentUnit(units: StockUnitOption[], current: string | null | undefined) {
  if (!current || units.some((unit) => unit.name === current)) return units;
  return [
    ...units,
    { id: 0, name: current, pluralName: current, active: false },
  ];
}