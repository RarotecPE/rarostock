"use client";

import { useRouter } from "next/navigation";
import { DashboardTab } from "@/components/tabs/DashboardTab";
import { useStockSession } from "@/components/layout/StockAppShell";

export default function DashboardPage() {
  const router = useRouter();
  const { canMutateStock } = useStockSession();

  return (
    <DashboardTab
      canManageStock={canMutateStock}
      onNavigate={(path) => router.push(path)}
    />
  );
}
