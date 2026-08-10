"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Item, normalizeSearch, getStockStatus, formatLimit } from "@/types/stock";
import { StatusBadge } from "@/components/ui/Badge";
import { ItemDetailModal } from "@/components/modals/ItemDetailModal";

type SortField = "code" | "name" | "category" | "quantity" | "minimumLimit" | "desiredLimit" | "status";
type SortDir = "asc" | "desc";

interface ProductListProps {
  refreshKey?: number;
  canManageStock: boolean;
}

export function ProductList({ refreshKey = 0, canManageStock }: ProductListProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>("code");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/items");
    const data = await res.json().catch(() => []);
    setItems(res.ok && Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { const timer = setTimeout(() => void fetchItems(), 0); return () => clearTimeout(timer); }, [fetchItems, refreshKey]);

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const norm = normalizeSearch(search);
      result = result.filter((i) => normalizeSearch(i.name).includes(norm) || normalizeSearch(i.code).includes(norm));
    }
    if (categoryFilter) result = result.filter((i) => i.category === categoryFilter);
    if (statusFilter) result = result.filter((i) => getStockStatus(i.quantity, i.minimumLimit, i.desiredLimit) === statusFilter);

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === "code") cmp = a.code.localeCompare(b.code);
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      if (sortField === "category") cmp = a.category.localeCompare(b.category);
      if (sortField === "quantity") cmp = a.quantity - b.quantity;
      if (sortField === "minimumLimit") cmp = a.minimumLimit - b.minimumLimit;
      if (sortField === "desiredLimit") cmp = a.desiredLimit - b.desiredLimit;
      if (sortField === "status") cmp = getStockStatus(a.quantity, a.minimumLimit, a.desiredLimit).localeCompare(getStockStatus(b.quantity, b.minimumLimit, b.desiredLimit));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, search, categoryFilter, statusFilter, sortField, sortDir]);

  const categories = useMemo(() => [...new Set(items.map((i) => i.category))].sort(), [items]);
  const activeFiltersCount = [categoryFilter, statusFilter].filter(Boolean).length;

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const renderSortIcon = (field: SortField) => (
    <span className={sortField === field ? "text-blue-400" : "text-slate-600"}>{sortField === field && sortDir === "desc" ? "↓" : "↑"}</span>
  );

  const handleExport = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryFilter) params.set("category", categoryFilter);
    if (statusFilter) params.set("status", statusFilter);
    window.location.href = `/api/export${params.toString() ? `?${params}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou código..." className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 w-full pl-3" />
        </div>
        <button type="button" onClick={() => setShowFilters(!showFilters)} className={`btn-secondary flex items-center justify-center gap-2 ${showFilters || activeFiltersCount > 0 ? "border-blue-500/40 text-blue-300" : ""}`}>
          Filtros {activeFiltersCount > 0 ? <span className="rounded-full bg-blue-500 px-1.5 text-xs text-white">{activeFiltersCount}</span> : null}
        </button>
        <button type="button" onClick={handleExport} className="rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white">Exportar CSV</button>
      </div>

      {showFilters ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"><option value="">Todas as categorias</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"><option value="">Todos os status</option><option value="Em Estoque">Em Estoque</option><option value="Abaixo do Desejável">Abaixo do Desejável</option><option value="Abaixo do Mínimo">Abaixo do Mínimo</option><option value="Indisponível">Indisponível</option></select>
          </div>
          {activeFiltersCount > 0 ? <button type="button" onClick={() => { setCategoryFilter(""); setStatusFilter(""); }} className="mt-3 text-xs text-slate-400 hover:text-white">Limpar filtros</button> : null}
        </div>
      ) : null}

      {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" /></div> : filtered.length === 0 ? <div className="py-12 text-center text-slate-500">Nenhum produto encontrado</div> : (
        <>
          <p className="text-sm text-slate-400">{filtered.length} {filtered.length === 1 ? "produto encontrado" : "produtos encontrados"}</p>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/90 lg:block">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-800">{[["name","Nome"],["code","Código"],["category","Categoria"],["quantity","Saldo"],["minimumLimit","Lim. Min."],["desiredLimit","Lim. Des."],["status","Status"]].map(([field,label]) => <th key={field} className={field === "name" || field === "category" || field === "code" ? "px-4 py-3 text-left" : "px-4 py-3 text-center"}><button onClick={() => handleSort(field as SortField)} className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-300">{label}{renderSortIcon(field as SortField)}</button></th>)}</tr></thead>
              <tbody>{filtered.map((item) => <tr key={item.id} onClick={() => setSelectedItem(item)} className="cursor-pointer border-b border-slate-800/50 transition-colors hover:bg-slate-800/50"><td className="px-4 py-3 text-white">{item.name}</td><td className="px-4 py-3 font-mono text-xs text-blue-400">{item.code}</td><td className="px-4 py-3 text-slate-300">{item.category}</td><td className="px-4 py-3 text-center text-white">{item.quantity}</td><td className="px-4 py-3 text-center text-slate-400">{formatLimit(item.minimumLimit)}</td><td className="px-4 py-3 text-center text-slate-400">{formatLimit(item.desiredLimit)}</td><td className="px-4 py-3 text-center"><StatusBadge quantity={item.quantity} minimumLimit={item.minimumLimit} desiredLimit={item.desiredLimit} /></td></tr>)}</tbody>
            </table>
          </div>
          <div className="space-y-3 lg:hidden">{filtered.map((item) => <button key={item.id} onClick={() => setSelectedItem(item)} className="w-full rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-left transition-colors hover:border-slate-600"><div className="mb-2 flex items-start justify-between"><div><h3 className="font-semibold text-white">{item.name}</h3><p className="mt-0.5 font-mono text-xs text-blue-400">{item.code}</p></div><StatusBadge quantity={item.quantity} minimumLimit={item.minimumLimit} desiredLimit={item.desiredLimit} /></div><p className="text-xs text-slate-400">{item.category} · Saldo: {item.quantity} · Min: {formatLimit(item.minimumLimit)} · Desej: {formatLimit(item.desiredLimit)}</p></button>)}</div>
        </>
      )}

      {selectedItem ? <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onUpdate={() => { void fetchItems(); setSelectedItem(null); }} canManageStock={canManageStock} /> : null}
    </div>
  );
}



