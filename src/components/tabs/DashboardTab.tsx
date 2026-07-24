"use client";

import { useState, useEffect } from "react";
import { Item, getStockStatus } from "@/types/stock";

export function DashboardTab() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/items")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setItems(data);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const totalItems = items.length;
  const inStock = items.filter(
    (i) => getStockStatus(i.quantity, i.minimumLimit) === "Em Estoque"
  ).length;
  const belowMin = items.filter(
    (i) => getStockStatus(i.quantity, i.minimumLimit) === "Abaixo do Mínimo"
  ).length;
  const unavailable = items.filter(
    (i) => getStockStatus(i.quantity, i.minimumLimit) === "Indisponível"
  ).length;
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const alertCount = belowMin + unavailable;

  return (
    <div className="space-y-6">
      <div className="text-center lg:text-left">
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-slate-400 text-sm mt-1">
          Visao geral dos saldos e alertas do estoque
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Produtos
              </p>
              <p className="text-3xl font-bold text-white mt-1">{totalItems}</p>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Unidades
              </p>
              <p className="text-3xl font-bold text-blue-400 mt-1">{totalUnits}</p>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Em Estoque
              </p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">{inStock}</p>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Alertas
              </p>
              <p className="text-3xl font-bold text-amber-400 mt-1">{alertCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">Abaixo do minimo</p>
              <p className="text-4xl font-bold text-amber-400 mt-2">{belowMin}</p>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">Indisponiveis</p>
              <p className="text-4xl font-bold text-rose-400 mt-2">{unavailable}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
