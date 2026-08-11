"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Item, normalizeSearch, pluralizeUnit } from "@/types/stock";
import { StatusBadge } from "@/components/ui/Badge";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { Toast } from "@/components/ui/Toast";
import { FilterDropdown, FilterSection } from "@/components/ui/FilterDropdown";
import { useStockCatalog } from "@/lib/use-stock-catalog";

type BaixaMode = "unidade" | "saldo";

function getDateKey(value: string | Date) {
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface StockIssueHistoryRow {
  id: number;
  itemId: number;
  itemCode: string;
  itemName: string;
  itemUnit: string;
  quantity: number;
  date: string;
  createdAt: string;
  balanceAfter: number;
}

interface BaixaTabProps {
  canManageStock: boolean;
}

export function BaixaTab({ canManageStock }: BaixaTabProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mode, setMode] = useState<BaixaMode>("unidade");
  const [quantity, setQuantity] = useState<number | "">("");
  const [newBalance, setNewBalance] = useState<number | "">("");

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const { catalog } = useStockCatalog();

  const [issues, setIssues] = useState<StockIssueHistoryRow[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [showHistory, setShowHistory] = useState(!canManageStock);
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [showHistoryFilters, setShowHistoryFilters] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const historyPerPage = 10;

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/items");
    const data: Item[] = await res.json();
    setItems(data);
    setLoading(false);
  }, []);

  const fetchIssues = useCallback(async () => {
    setLoadingIssues(true);
    const res = await fetch(`/api/stock-issues`);
    const data: StockIssueHistoryRow[] = await res.json();
    setIssues(data);
    setLoadingIssues(false);
  }, []);

  useEffect(() => {
    const initialFetch = setTimeout(fetchItems, 0);

    return () => clearTimeout(initialFetch);
  }, [fetchItems]);

  useEffect(() => {
    const initialFetch = setTimeout(fetchIssues, 0);

    return () => clearTimeout(initialFetch);
  }, [fetchIssues]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return [];
    const norm = normalizeSearch(search);
    return items.filter(
      (i) =>
        normalizeSearch(i.name).includes(norm) ||
        normalizeSearch(i.code).includes(norm)
    );
  }, [items, search]);

  const calculatedQuantity = useMemo(() => {
    if (!selectedItem) return 0;
    if (mode === "unidade") {
      return typeof quantity === "number" ? quantity : 0;
    }
    if (typeof newBalance !== "number") return 0;
    return selectedItem.quantity - newBalance;
  }, [mode, quantity, newBalance, selectedItem]);

  const isValidSubmission = useMemo(() => {
    if (!selectedItem) return false;
    if (mode === "unidade") {
      return (
        typeof quantity === "number" &&
        quantity > 0 &&
        quantity <= selectedItem.quantity
      );
    }
    return (
      typeof newBalance === "number" &&
      newBalance >= 0 &&
      newBalance < selectedItem.quantity
    );
  }, [mode, quantity, newBalance, selectedItem]);

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setShowDropdown(false);
    setSearch("");
    setQuantity("");
    setNewBalance("");
  };

  const clearSelectedItem = () => {
    setSelectedItem(null);
    setQuantity("");
    setNewBalance("");
  };

  const handleSubmit = async () => {
    if (!selectedItem || !isValidSubmission) return;

    const finalQty = calculatedQuantity;
    if (finalQty <= 0) {
      setToast({
        message: "A quantidade de baixa deve ser maior que zero",
        type: "error",
      });
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/stock-issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: selectedItem.id,
        quantity: finalQty,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setToast({
        message: data.error || "Erro ao processar baixa",
        type: "error",
      });
      setSubmitting(false);
      return;
    }

    setToast({ message: "Baixa registrada com sucesso!", type: "success" });
    setSubmitting(false);
    setSelectedItem(null);
    setQuantity("");
    setNewBalance("");
    fetchItems();
    fetchIssues();
  };

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const dayKey = getDateKey(issue.createdAt);
      if (historyStartDate && dayKey < historyStartDate) return false;
      if (historyEndDate && dayKey > historyEndDate) return false;
      return true;
    });
  }, [issues, historyStartDate, historyEndDate]);

  const paginatedIssues = filteredIssues.slice(
    (historyPage - 1) * historyPerPage,
    historyPage * historyPerPage
  );
  const totalHistoryPages = Math.max(1, Math.ceil(filteredIssues.length / historyPerPage));

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="text-center lg:text-left">
          <h2 className="text-2xl font-bold text-white">Baixa de Estoque</h2>
          <p className="text-slate-400 text-sm mt-1">
            {canManageStock
              ? "Registre saÃƒÂ­das de itens do estoque"
              : "Consulte o historico de baixas do estoque"}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 lg:justify-end">
          <RefreshButton onClick={() => { void fetchItems(); void fetchIssues(); }} />
        </div>
      </div>

      {canManageStock ? (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Item *
          </label>
          {selectedItem ? (
            <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-500/15 border border-blue-500/30 rounded-lg">
              <div className="flex-1 min-w-0">
                <span className="text-blue-400 font-mono text-xs">{selectedItem.code}</span>
                <span className="text-white text-sm ml-1.5">{selectedItem.name}</span>
              </div>
              <button
                onClick={clearSelectedItem}
                className="flex-shrink-0 p-1 hover:bg-blue-500/20 rounded transition-colors"
              >
                <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Digite o cÃ³digo ou nome do item..."
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />

              {showDropdown && search && (
                <div className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg max-h-60 overflow-y-auto shadow-xl">
                  {loading ? (
                    <div className="px-3 py-4 flex justify-center">
                      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-slate-500">
                      Nenhum item encontrado
                    </p>
                  ) : (
                    filteredItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className="w-full text-left px-3 py-2.5 hover:bg-slate-700 transition-colors border-b border-slate-700/50 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-blue-400 font-mono text-xs">
                              {item.code}
                            </span>
                            <span className="text-white ml-2">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              Saldo: {item.quantity}
                            </span>
                            <StatusBadge
                              quantity={item.quantity}
                              minimumLimit={item.minimumLimit}
                              desiredLimit={item.desiredLimit}
                            />
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {selectedItem && (
          <>
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Item Selecionado</p>
                  <p className="text-white font-medium">{selectedItem.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Saldo Atual</p>
                  <p className="text-lg font-bold text-white">
                    {selectedItem.quantity}{" "}
                    <span className="text-sm text-slate-400 font-normal">
                      {pluralizeUnit(selectedItem.unit, selectedItem.quantity, catalog.units)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Modo de Baixa
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("unidade");
                    setNewBalance("");
                  }}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                    mode === "unidade"
                      ? "bg-blue-600/20 border-blue-500/30 text-blue-400"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  Por Quantidade
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("saldo");
                    setQuantity("");
                  }}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
                    mode === "saldo"
                      ? "bg-blue-600/20 border-blue-500/30 text-blue-400"
                      : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                >
                  Por Saldo Atualizado
                </button>
              </div>
            </div>

            <div className="max-w-sm mx-auto lg:mx-0">
              {mode === "unidade" ? (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Quantidade a Retirar *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedItem.quantity}
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(e.target.value ? parseInt(e.target.value) : "");
                    }}
                    placeholder="Quantidade"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {typeof quantity === "number" && quantity > selectedItem.quantity && (
                    <p className="text-xs text-rose-400 mt-1">
                      Excede o saldo disponÃ­vel
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Novo Saldo *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={selectedItem.quantity - 1}
                    value={newBalance}
                    onChange={(e) => {
                      setNewBalance(e.target.value ? parseInt(e.target.value) : "");
                    }}
                    placeholder="Saldo atualizado apÃ³s contagem"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {typeof newBalance === "number" && newBalance >= selectedItem.quantity && (
                    <p className="text-xs text-rose-400 mt-1">
                      O novo saldo deve ser menor que o atual
                    </p>
                  )}
                  {typeof newBalance === "number" && newBalance < selectedItem.quantity && (
                    <p className="text-xs text-slate-400 mt-1">
                      SerÃ¡ registrada baixa de{" "}
                      <span className="text-white font-medium">{calculatedQuantity}</span>{" "}
                      {pluralizeUnit(selectedItem.unit, calculatedQuantity, catalog.units)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {isValidSubmission && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                <p className="text-sm text-rose-300">
                  <span className="font-medium">Resumo:</span> SerÃ¡ registrada baixa de{" "}
                  <span className="font-bold">
                    {calculatedQuantity}{" "}
                    {pluralizeUnit(selectedItem.unit, calculatedQuantity, catalog.units)}
                  </span>
                  .
                  {mode === "saldo" ? (
                    <span>
                      {" "}Saldo passarÃ¡ de {selectedItem.quantity} para {newBalance}.
                    </span>
                  ) : (
                    <span>
                      {" "}O saldo atualizado serÃ¡ de{" "}
                      <span className="font-bold">
                        {selectedItem.quantity - calculatedQuantity}
                      </span>
                      .
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="flex justify-center lg:justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={clearSelectedItem}
                className="px-4 py-2.5 text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !isValidSubmission}
                className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirmar Baixa
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-400">
          Seu perfil permite visualizar o historico de baixas, mas nao registrar novas saidas.
        </div>
      )}

      <div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showHistory ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          HistÃ³rico de Baixas ({filteredIssues.length})
        </button>
      </div>

      {showHistory && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">          <div className="flex justify-end">
            <FilterDropdown
              open={showHistoryFilters}
              onOpenChange={setShowHistoryFilters}
              activeCount={(historyStartDate ? 1 : 0) + (historyEndDate ? 1 : 0)}
              onClear={() => { setHistoryStartDate(""); setHistoryEndDate(""); setHistoryPage(1); }}
            >
              <FilterSection title="Período" activeCount={(historyStartDate ? 1 : 0) + (historyEndDate ? 1 : 0)}>
                <div className="grid grid-cols-1 gap-2">
                  <label className="space-y-1 text-sm text-slate-300"><span className="block text-xs text-slate-500">Data inicial</span><input type="date" value={historyStartDate} onChange={(e) => { setHistoryStartDate(e.target.value); setHistoryPage(1); }} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500" /></label>
                  <label className="space-y-1 text-sm text-slate-300"><span className="block text-xs text-slate-500">Data final</span><input type="date" value={historyEndDate} onChange={(e) => { setHistoryEndDate(e.target.value); setHistoryPage(1); }} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500" /></label>
                </div>
              </FilterSection>
            </FilterDropdown>
          </div>

          {loadingIssues ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredIssues.length === 0 ? (
            <p className="text-center py-8 text-slate-500">
              Nenhuma baixa encontrada
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {paginatedIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-800/50 rounded-lg p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <span className="text-white font-medium">#{issue.id}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400">
                            {new Date(issue.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                          <span className="text-slate-600">
                            {new Date(issue.createdAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 min-w-0">
                        <span className="text-blue-400 font-mono text-xs">
                          {issue.itemCode}
                        </span>
                        <span className="text-slate-300 text-sm ml-2 truncate">
                          {issue.itemName}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-auto">
                      <span className="text-slate-600 flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium">
                        <span>Saldo</span>
                        <span className="text-slate-500 normal-case text-xs tracking-normal">
                          {issue.balanceAfter}
                        </span>
                      </span>
                      <span className="text-rose-400 font-semibold text-sm">
                        -{issue.quantity} {pluralizeUnit(issue.itemUnit, issue.quantity, catalog.units)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {totalHistoryPages > 1 && (
                <div className="flex items-center justify-center gap-1 text-xs">
                  <button
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 disabled:opacity-40"
                  >
                    ?
                  </button>
                  <span className="px-2 text-slate-500">
                    {historyPage} / {totalHistoryPages}
                  </span>
                  <button
                    onClick={() =>
                      setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))
                    }
                    disabled={historyPage === totalHistoryPages}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 disabled:opacity-40"
                  >
                    ?
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
