"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Item, normalizeSearch, getStockStatus, formatLimit } from "@/types/stock";
import { StatusBadge } from "@/components/ui/Badge";
import { ItemDetailModal } from "@/components/modals/ItemDetailModal";
import { FilterCheckbox, FilterDropdown, FilterSection, toggleFilterValue } from "@/components/ui/FilterDropdown";

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
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
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

  useEffect(() => {
    const timer = setTimeout(() => void fetchItems(), 0);
    return () => clearTimeout(timer);
  }, [fetchItems, refreshKey]);

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const norm = normalizeSearch(search);
      result = result.filter((i) => normalizeSearch(i.name).includes(norm) || normalizeSearch(i.code).includes(norm));
    }
    if (categoryFilters.length) result = result.filter((i) => categoryFilters.includes(i.category));
    if (statusFilters.length) result = result.filter((i) => statusFilters.includes(getStockStatus(i.quantity, i.minimumLimit, i.desiredLimit)));

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
  }, [items, search, categoryFilters, statusFilters, sortField, sortDir]);

  const categories = useMemo(() => [...new Set(items.map((i) => i.category))].sort(), [items]);
  const statusOptions = ["Em Estoque", "Abaixo do Desejável", "Abaixo do Mínimo", "Indisponível"];
  const activeFiltersCount = categoryFilters.length + statusFilters.length;

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const renderSortIcon = (field: SortField) => {
    const active = sortField === field;
    const descending = active && sortDir === "desc";

    return (
      <svg className={`h-3 w-3 transition-transform ${active ? "text-blue-400" : "text-slate-600"} ${descending ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  };

return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou código..." className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 pl-3 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500" />
        </div>
        <FilterDropdown
          open={showFilters}
          onOpenChange={setShowFilters}
          activeCount={activeFiltersCount}
          onClear={() => { setCategoryFilters([]); setStatusFilters([]); }}
        >
          <FilterSection title="Categorias" activeCount={categoryFilters.length}>
            {categories.map((category) => (
              <FilterCheckbox key={category} label={category} checked={categoryFilters.includes(category)} onChange={() => setCategoryFilters((prev) => toggleFilterValue(prev, category))} />
            ))}
          </FilterSection>
          <FilterSection title="Status" activeCount={statusFilters.length}>
            {statusOptions.map((status) => (
              <FilterCheckbox key={status} label={status} checked={statusFilters.includes(status)} onChange={() => setStatusFilters((prev) => toggleFilterValue(prev, status))} />
            ))}
          </FilterSection>
        </FilterDropdown>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" /></div> : filtered.length === 0 ? <div className="py-12 text-center text-slate-500">Nenhum produto encontrado</div> : (
        <>
          <p className="text-sm text-slate-400">{filtered.length} {filtered.length === 1 ? "produto encontrado" : "produtos encontrados"}</p>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/90 lg:block">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-800">{[["name","Nome"],["code","Código"],["category","Categoria"],["quantity","Saldo"],["minimumLimit","Lim. Min."],["desiredLimit","Lim. Des."],["status","Status"]].map(([field,label]) => <th key={field} className={field === "name" || field === "category" || field === "code" ? "px-4 py-3 text-left" : "px-4 py-3 text-center"}><button onClick={() => handleSort(field as SortField)} className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-300">{label}{renderSortIcon(field as SortField)}</button></th>)}</tr></thead>
              <tbody>{filtered.map((item) => <tr key={item.id} onClick={() => setSelectedItem(item)} className="cursor-pointer border-b border-slate-800/50 transition-colors hover:bg-slate-800/50"><td className="px-4 py-3 text-white">{item.name}</td><td className="px-4 py-3 font-mono text-xs text-blue-400">{item.code}</td><td className="px-4 py-3 text-slate-300">{item.category}</td><td className="px-4 py-3 text-center text-white">{item.quantity}</td><td className="px-4 py-3 text-center text-slate-400">{formatLimit(item.minimumLimit)}</td><td className="px-4 py-3 text-center text-slate-400">{formatLimit(item.desiredLimit)}</td><td className="px-4 py-3 text-center"><StatusBadge quantity={item.quantity} minimumLimit={item.minimumLimit} desiredLimit={item.desiredLimit} /></td></tr>)}</tbody>
            </table>
          </div>
          <div className="space-y-3 lg:hidden">{filtered.map((item) => <button key={item.id} onClick={() => setSelectedItem(item)} className="w-full rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-left transition-colors hover:border-slate-600"><div className="mb-3 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-semibold text-white">{item.name}</h3><p className="mt-0.5 font-mono text-xs text-blue-400">{item.code}</p></div><span className="shrink-0"><StatusBadge quantity={item.quantity} minimumLimit={item.minimumLimit} desiredLimit={item.desiredLimit} /></span></div><div className="grid grid-cols-2 gap-2 text-xs text-slate-400"><span className="col-span-2 truncate">{item.category}</span><span>Saldo: <strong className="text-slate-200">{item.quantity}</strong></span><span>Min: {formatLimit(item.minimumLimit)}</span><span>Desej: {formatLimit(item.desiredLimit)}</span></div></button>)}</div>
        </>
      )}
{selectedItem ? <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onUpdate={() => { void fetchItems(); setSelectedItem(null); }} canManageStock={canManageStock} /> : null}
    </div>
  );
}
