"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Item,
  normalizeSearch,
  getStockStatus,
  formatMinimumLimit,
} from "@/types/stock";
import { StatusBadge, TypeBadge } from "@/components/ui/Badge";
import { ItemDetailModal } from "@/components/modals/ItemDetailModal";

const PER_PAGE_OPTIONS = [5, 10, 20, 50, 0] as const;

type SortField =
  | "code"
  | "name"
  | "category"
  | "type"
  | "quantity"
  | "minimumLimit"
  | "status";
type SortDir = "asc" | "desc";

interface ProductListProps {
  refreshKey?: number;
}

export function ProductList({ refreshKey = 0 }: ProductListProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>("code");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/items");
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }, []);

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
  }, [refreshKey]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return (
        <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDir === "asc" ? (
      <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const filtered = useMemo(() => {
    let result = items;

    if (search) {
      const norm = normalizeSearch(search);
      result = result.filter(
        (i) =>
          normalizeSearch(i.name).includes(norm) ||
          normalizeSearch(i.code).includes(norm)
      );
    }

    if (typeFilter) result = result.filter((i) => i.type === typeFilter);
    if (categoryFilter) result = result.filter((i) => i.category === categoryFilter);
    if (statusFilter) {
      result = result.filter(
        (i) => getStockStatus(i.quantity, i.minimumLimit) === statusFilter
      );
    }

    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "code":
          cmp = a.code.localeCompare(b.code);
          break;
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
        case "quantity":
          cmp = a.quantity - b.quantity;
          break;
        case "minimumLimit": {
          const aValue = a.minimumLimit ?? Number.POSITIVE_INFINITY;
          const bValue = b.minimumLimit ?? Number.POSITIVE_INFINITY;
          cmp = aValue - bValue;
          break;
        }
        case "status":
          cmp = getStockStatus(a.quantity, a.minimumLimit).localeCompare(
            getStockStatus(b.quantity, b.minimumLimit)
          );
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, search, typeFilter, categoryFilter, statusFilter, sortField, sortDir]);

  const categories = useMemo(() => {
    const cats = [...new Set(items.map((i) => i.category))].filter(
      (c) => c !== "Outro"
    );
    cats.sort();
    if (items.some((i) => i.category === "Outro")) cats.push("Outro");
    return cats;
  }, [items]);

  const totalPages =
    perPage === 0 ? 1 : Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated =
    perPage === 0 ? filtered : filtered.slice((page - 1) * perPage, page * perPage);
  const activeFiltersCount = [typeFilter, categoryFilter, statusFilter].filter(Boolean).length;

  const resetPage = () => {
    setPage(1);
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (typeFilter) params.set("type", typeFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (statusFilter) params.set("status", statusFilter);
    window.open(`/api/export?${params}`, "_blank");
  };

  const clearFilters = () => {
    setTypeFilter("");
    setCategoryFilter("");
    setStatusFilter("");
    resetPage();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4">
        <div className="text-center lg:text-left">
          <h3 className="text-lg font-semibold text-white">
            Produtos cadastrados
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Consulte, filtre e edite os produtos do estoque
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
            placeholder="Buscar por nome ou codigo..."
            className="w-full pl-9 pr-3 py-2.5 bg-slate-900/90 border border-slate-800 rounded-lg text-white text-sm placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
            showFilters || activeFiltersCount > 0
              ? "bg-blue-600/20 border-blue-500/30 text-blue-400"
              : "bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtros
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 bg-blue-500 rounded-full text-xs text-white flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-300">Filtros avancados</h4>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                resetPage();
              }}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos os Tipos</option>
              <option value="Equipamento">Equipamento</option>
              <option value="Item de Consumo">Item de Consumo</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                resetPage();
              }}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                resetPage();
              }}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos os Status</option>
              <option value="Em Estoque">Em Estoque</option>
              <option value={"Abaixo do M\u00EDnimo"}>Abaixo do Minimo</option>
              <option value={"Indispon\u00EDvel"}>Indisponivel</option>
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p>Nenhum produto encontrado com os filtros aplicados</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-slate-400">
            {filtered.length} {filtered.length === 1 ? "produto encontrado" : "produtos encontrados"}
          </p>

          <div className="hidden lg:block overflow-x-auto bg-slate-900/90 border border-slate-800 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {[
                    ["code", "Codigo"],
                    ["name", "Nome"],
                    ["category", "Categoria"],
                    ["type", "Tipo"],
                    ["quantity", "Saldo"],
                    ["minimumLimit", "Lim. Min."],
                    ["status", "Status"],
                  ].map(([field, label]) => (
                    <th
                      key={field}
                      className={
                        field === "quantity" || field === "minimumLimit" || field === "status"
                          ? "text-center px-4 py-3"
                          : "text-left px-4 py-3"
                      }
                    >
                      <button
                        onClick={() => handleSort(field as SortField)}
                        className={`flex items-center gap-1.5 text-xs text-slate-500 uppercase tracking-wider font-medium hover:text-slate-300 transition-colors ${
                          field === "quantity" || field === "minimumLimit" || field === "status"
                            ? "mx-auto"
                            : ""
                        }`}
                      >
                        {label}
                        {renderSortIcon(field as SortField)}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="border-b border-slate-800/50 hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-blue-400 text-xs">{item.code}</td>
                    <td className="px-4 py-3 text-white">{item.name}</td>
                    <td className="px-4 py-3 text-slate-300">{item.category}</td>
                    <td className="px-4 py-3 min-w-36">
                      <TypeBadge type={item.type} />
                    </td>
                    <td className="px-4 py-3 text-center text-white">{item.quantity}</td>
                    <td className="px-4 py-3 text-center text-slate-400">
                      {formatMinimumLimit(item.minimumLimit)}
                    </td>
                    <td className="px-4 py-3 text-center min-w-40">
                      <StatusBadge quantity={item.quantity} minimumLimit={item.minimumLimit} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-3">
            {paginated.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="w-full text-left bg-slate-900/90 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs text-blue-400 font-mono">{item.code}</p>
                    <h3 className="text-white font-semibold mt-0.5">{item.name}</h3>
                  </div>
                  <StatusBadge quantity={item.quantity} minimumLimit={item.minimumLimit} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <TypeBadge type={item.type} />
                  <span className="text-xs text-slate-400">{item.category}</span>
                  <span className="text-xs text-slate-500">-</span>
                  <span className="text-xs text-slate-400">
                    Saldo: {item.quantity} | Min: {formatMinimumLimit(item.minimumLimit)}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {perPage > 0 && (
            <div className="flex items-center justify-between text-xs">
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(parseInt(e.target.value));
                  resetPage();
                }}
                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              >
                {PER_PAGE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? "Todos" : `${n}/pag`}
                  </option>
                ))}
              </select>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800">
                    {"<"}
                  </button>
                  <span className="px-2 text-slate-500">
                    {page} / {totalPages}
                  </span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800">
                    {">"}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {selectedItem && (
        <ItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={() => {
            fetchItems();
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
}
