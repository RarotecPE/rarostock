"use client";

import { BaixaTab } from "@/components/tabs/BaixaTab";
import { useStockSession } from "@/components/layout/StockAppShell";

export default function BaixasPage() {
  const { canMutateStock } = useStockSession();

  return <BaixaTab canManageStock={canMutateStock} />;
}
