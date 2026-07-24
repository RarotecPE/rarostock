"use client";
import { getStockStatus } from "@/types/stock";

export function StatusBadge({
  quantity,
  minimumLimit,
}: {
  quantity: number;
  minimumLimit: number | null;
}) {
  const status = getStockStatus(quantity, minimumLimit);
  const cls =
    status === "Em Estoque"
      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
      : status === "Abaixo do Mínimo"
        ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
        : "bg-rose-500/15 text-rose-300 border border-rose-500/30";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {status}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const cls =
    type === "Equipamento"
      ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
      : "bg-sky-500/15 text-sky-300 border border-sky-500/30";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {type}
    </span>
  );
}
