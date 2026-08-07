"use client";

import { ProdutoTab } from "@/components/tabs/ProdutoTab";
import { useStockSession } from "@/components/layout/StockAppShell";

export default function ProdutosPage() {
  const { canMutateStock } = useStockSession();

  return <ProdutoTab canManageStock={canMutateStock} />;
}
