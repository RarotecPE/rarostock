import type { ReactNode } from "react";
import { StockAppShell } from "@/components/layout/StockAppShell";

export default function StockLayout({ children }: { children: ReactNode }) {
  return <StockAppShell>{children}</StockAppShell>;
}
