"use client";

import { AquisicaoTab } from "@/components/tabs/AquisicaoTab";
import { useStockSession } from "@/components/layout/StockAppShell";

export default function AquisicoesPage() {
  const { canMutateStock, canDeleteInvoice } = useStockSession();

  return (
    <AquisicaoTab
      canManageStock={canMutateStock}
      canDeleteInvoice={canDeleteInvoice}
    />
  );
}
