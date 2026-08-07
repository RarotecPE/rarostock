"use client";

import Link from "next/link";
import { StockCatalogAdmin } from "@/components/settings/StockCatalogAdmin";
import { useStockSession } from "@/components/layout/StockAppShell";

export default function CatalogoPage() {
  const { isAdmin } = useStockSession();

  if (!isAdmin) {
    return (
      <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 text-center">
        <h1 className="text-xl font-semibold text-white">Acesso negado</h1>
        <p className="mt-2 text-sm text-slate-400">
          Apenas administradores podem acessar as configurações do catálogo.
        </p>
        <Link
          className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          href="/dashboard"
        >
          Voltar ao Dashboard
        </Link>
      </section>
    );
  }

  return <StockCatalogAdmin />;
}
