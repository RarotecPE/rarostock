"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Item, normalizeSearch, getStockStatus, formatLimit } from "@/types/stock";
import { StatusBadge } from "@/components/ui/Badge";
import { ItemDetailModal } from "@/components/modals/ItemDetailModal";
import { FilterCheckbox, FilterDropdown, FilterSection, toggleFilterValue } from "@/components/ui/FilterDropdown";
import { PaginationControls, getTotalPages, paginate } from "@/components/ui/PaginationControls";
import { useActionCursor } from "@/lib/use-action-cursor";

type SortField = "code" | "name" | "category" | "quantity" | "minimumLimit" | "desiredLimit" | "status";
type SortDir = "asc" | "desc";

function getShoppingListFilename() {
  const date = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date())
    .replace(/\//g, ".");

  return `lista_de_compras_${date}.pdf`;
}

interface ProductListProps {
  refreshKey?: number;
  canManageStock: boolean;
  isAdmin?: boolean;
}

export function ProductList({ refreshKey = 0, canManageStock, isAdmin = false }: ProductListProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [shoppingListModalOpen, setShoppingListModalOpen] = useState(false);
  const [shoppingListWarning, setShoppingListWarning] = useState("");
  const [shoppingListDownloading, setShoppingListDownloading] = useState(false);
  const [selectedShoppingItemIds, setSelectedShoppingItemIds] = useState<number[]>([]);
  const [sendShoppingListEmail, setSendShoppingListEmail] = useState(false);
  const [sortField, setSortField] = useState<SortField>("code");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  useActionCursor(shoppingListDownloading);

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

  const currentPage = Math.min(page, getTotalPages(filtered.length));
  const paginated = useMemo(() => paginate(filtered, currentPage), [filtered, currentPage]);

  const categories = useMemo(() => [...new Set(items.map((i) => i.category))].sort(), [items]);
  const statusOptions = ["Em Estoque", "Abaixo do Desejável", "Abaixo do Mínimo", "Indisponível"];
  const activeFiltersCount = categoryFilters.length + statusFilters.length;
  const shoppingListItems = useMemo(
    () =>
      filtered
        .map((item) => ({
          item,
          purchaseQuantity: Math.max(0, item.desiredLimit - item.quantity),
        }))
        .filter((entry) => entry.purchaseQuantity > 0),
    [filtered],
  );

  const handleSort = (field: SortField) => {
    setPage(1);
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

  const selectedShoppingItems = useMemo(() => {
    const selected = new Set(selectedShoppingItemIds);
    return shoppingListItems.filter(({ item }) => selected.has(item.id));
  }, [selectedShoppingItemIds, shoppingListItems]);

  const buildShoppingListUrl = (productIds = selectedShoppingItemIds) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    categoryFilters.forEach((category) => params.append("category", category));
    statusFilters.forEach((status) => params.append("status", status));
    productIds.forEach((id) => params.append("productId", String(id)));
    return `/api/shopping-list${params.toString() ? `?${params}` : ""}`;
  };

  const handleOpenShoppingListModal = () => {
    if (shoppingListItems.length === 0) {
      setShoppingListWarning("Nenhum produto filtrado está abaixo do limite desejável.");
      return;
    }

    setShoppingListWarning("");
    setSelectedShoppingItemIds(shoppingListItems.map(({ item }) => item.id));
    setSendShoppingListEmail(false);
    setShoppingListModalOpen(true);
  };

  const handleDownloadShoppingList = async () => {
    if (selectedShoppingItemIds.length === 0) {
      setShoppingListWarning("Selecione ao menos um produto para gerar a lista de compras.");
      return;
    }

    setShoppingListDownloading(true);
    setShoppingListWarning("");
    let emailError = "";

    try {
      if (sendShoppingListEmail) {
        const emailResponse = await fetch("/api/shopping-list/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            search,
            categories: categoryFilters,
            statuses: statusFilters,
            productIds: selectedShoppingItemIds,
          }),
          cache: "no-store",
        });

        if (!emailResponse.ok) {
          const payload = await emailResponse.json().catch(() => null);
          emailError = payload?.error ?? "Não foi possível enviar a lista por e-mail.";
        }
      }

      const response = await fetch(buildShoppingListUrl(), { cache: "no-store" });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Não foi possível gerar a lista de compras.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getShoppingListFilename();
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      if (emailError) {
        setShoppingListWarning(`${emailError} O PDF foi baixado normalmente.`);
      } else {
        setShoppingListModalOpen(false);
      }
    } catch (error) {
      setShoppingListWarning(error instanceof Error ? error.message : "Não foi possível gerar a lista de compras.");
    } finally {
      setShoppingListDownloading(false);
    }
  };

  const toggleShoppingItem = (id: number) => {
    setSelectedShoppingItemIds((current) => (current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]));
  };

return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por nome ou código..." className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 pl-3 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500" />
        </div>
        <FilterDropdown
          open={showFilters}
          onOpenChange={setShowFilters}
          activeCount={activeFiltersCount}
          onClear={() => { setCategoryFilters([]); setStatusFilters([]); setPage(1); }}
        >
          <FilterSection title="Categorias" activeCount={categoryFilters.length}>
            {categories.map((category) => (
              <FilterCheckbox key={category} label={category} checked={categoryFilters.includes(category)} onChange={() => { setCategoryFilters((prev) => toggleFilterValue(prev, category)); setPage(1); }} />
            ))}
          </FilterSection>
          <FilterSection title="Status" activeCount={statusFilters.length}>
            {statusOptions.map((status) => (
              <FilterCheckbox key={status} label={status} checked={statusFilters.includes(status)} onChange={() => { setStatusFilters((prev) => toggleFilterValue(prev, status)); setPage(1); }} />
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
              <tbody>{paginated.map((item) => <tr key={item.id} onClick={() => setSelectedItem(item)} className="cursor-pointer border-b border-slate-800/50 transition-colors hover:bg-slate-800/50"><td className="px-4 py-3 text-white">{item.name}</td><td className="px-4 py-3 font-mono text-xs text-blue-400">{item.code}</td><td className="px-4 py-3 text-slate-300">{item.category}</td><td className="px-4 py-3 text-center text-white">{item.quantity}</td><td className="px-4 py-3 text-center text-slate-400">{formatLimit(item.minimumLimit)}</td><td className="px-4 py-3 text-center text-slate-400">{formatLimit(item.desiredLimit)}</td><td className="px-4 py-3 text-center"><StatusBadge quantity={item.quantity} minimumLimit={item.minimumLimit} desiredLimit={item.desiredLimit} /></td></tr>)}</tbody>
            </table>
          </div>
          <div className="space-y-3 lg:hidden">{paginated.map((item) => <button key={item.id} onClick={() => setSelectedItem(item)} className="w-full rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-left transition-colors hover:border-slate-600"><div className="mb-3 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-semibold text-white">{item.name}</h3><p className="mt-0.5 font-mono text-xs text-blue-400">{item.code}</p></div><span className="shrink-0"><StatusBadge quantity={item.quantity} minimumLimit={item.minimumLimit} desiredLimit={item.desiredLimit} /></span></div><div className="grid grid-cols-2 gap-2 text-xs text-slate-400"><span className="col-span-2 truncate">{item.category}</span><span>Saldo: <strong className="text-slate-200">{item.quantity}</strong></span><span>Min: {formatLimit(item.minimumLimit)}</span><span>Desej: {formatLimit(item.desiredLimit)}</span></div></button>)}</div>
          <PaginationControls page={currentPage} totalItems={filtered.length} onPageChange={setPage} itemLabel="produtos" />
        </>
      )}
      {shoppingListWarning ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {shoppingListWarning}
        </div>
      ) : null}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleOpenShoppingListModal}
          className="shopping-list-button w-full rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors sm:w-auto"
        >
          Gerar Lista de Compras
        </button>
      </div>
      {shoppingListModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setShoppingListModalOpen(false)}>
          <div className="shopping-list-modal flex max-h-[86vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="p-5 pb-3">
              <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="shopping-list-modal-title text-lg font-bold">Gerar lista de compras?</h3>
                <p className="shopping-list-modal-description mt-1 text-sm">
                  Escolha os produtos que devem entrar no PDF.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShoppingListModalOpen(false)}
                disabled={shoppingListDownloading}
                className="rounded-lg p-2 text-2xl leading-none text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                aria-label="Fechar"
              >
                ×
              </button>
              </div>
            </div>

            {shoppingListWarning ? (
              <div className="mx-5 mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                {shoppingListWarning}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-2">
              {shoppingListItems.map(({ item, purchaseQuantity }) => {
                const checked = selectedShoppingItemIds.includes(item.id);
                return (
                <label key={item.id} className="shopping-list-preview-item flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-600"
                    checked={checked}
                    onChange={() => toggleShoppingItem(item.id)}
                  />
                  <div className="min-w-0">
                    <p className="shopping-list-preview-name truncate text-sm font-medium">{item.name}</p>
                    <p className="shopping-list-preview-code font-mono text-xs">
                      {item.code} · Estoque {item.quantity} · Desejável {item.desiredLimit}
                    </p>
                  </div>
                  <span className="shopping-list-preview-quantity ml-auto shrink-0 text-sm font-semibold">
                    Comprar {purchaseQuantity}
                  </span>
                </label>
                );
              })}
            </div>

            <div className="border-t border-slate-800/80 p-5">
              <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 text-sm font-medium text-slate-300">
                <input
                  type="checkbox"
                  checked={sendShoppingListEmail}
                  onChange={(event) => setSendShoppingListEmail(event.target.checked)}
                />
                Enviar também para meu e-mail
              </label>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <p className="text-xs text-slate-500">
                  {selectedShoppingItems.length} de {shoppingListItems.length} {shoppingListItems.length === 1 ? "item selecionado" : "itens selecionados"}
                </p>
              <button
                type="button"
                onClick={handleDownloadShoppingList}
                disabled={shoppingListDownloading}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {shoppingListDownloading ? "Gerando..." : "Baixar PDF"}
              </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
{selectedItem ? <ItemDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onUpdate={() => { void fetchItems(); setSelectedItem(null); }} canManageStock={canManageStock} isAdmin={isAdmin} /> : null}
    </div>
  );
}

