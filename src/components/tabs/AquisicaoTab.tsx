"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Item, CartItem, normalizeSearch, Acquisition, pluralizeUnit } from "@/types/stock";
import { InvoicePreviewModal } from "@/components/modals/InvoicePreviewModal";
import { AcquisitionDetailModal } from "@/components/modals/AcquisitionDetailModal";
import { Toast } from "@/components/ui/Toast";

function nowDateTimeLocal() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function getDateKey(value: string | Date) {
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatLiveDateTime(d: Date) {
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface AquisicaoTabProps {
  canManageStock: boolean;
  canDeleteInvoice: boolean;
}

export function AquisicaoTab({ canManageStock, canDeleteInvoice }: AquisicaoTabProps) {
  // History state
  const [acquisitions, setAcquisitions] = useState<Acquisition[]>([]);
  const [loadingAcq, setLoadingAcq] = useState(true);
  const [showHistory, setShowHistory] = useState(!canManageStock);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [previewInvoice, setPreviewInvoice] = useState<{
    url: string;
    filename?: string | null;
  } | null>(null);
  const [selectedAcqId, setSelectedAcqId] = useState<number | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const historyPerPage = 10;

  // New acquisition state
  const [items, setItems] = useState<Item[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [useManualAcqDate, setUseManualAcqDate] = useState(false);
  const [acqDate, setAcqDate] = useState(nowDateTimeLocal());
  const [liveNow, setLiveNow] = useState(new Date());
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  
  // Item selection
  const [searchItem, setSearchItem] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [addQty, setAddQty] = useState<number | "">("");
  const [addPrice, setAddPrice] = useState<number | "">("");
  
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const fetchAcquisitions = useCallback(async () => {
    setLoadingAcq(true);
    const res = await fetch(`/api/acquisitions`);
    const data = await res.json();
    setAcquisitions(data);
    setLoadingAcq(false);
  }, []);

  const fetchItems = useCallback(async () => {
    setLoadingItems(true);
    const res = await fetch("/api/items");
    const data = await res.json();
    setItems(data);
    setLoadingItems(false);
  }, []);

  useEffect(() => {
    const initialFetch = setTimeout(() => {
      fetchAcquisitions();
      fetchItems();
    }, 0);

    return () => clearTimeout(initialFetch);
  }, [fetchAcquisitions, fetchItems]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchItem.trim()) return [];
    const norm = normalizeSearch(searchItem);
    return items.filter(
      (i) =>
        normalizeSearch(i.name).includes(norm) ||
        normalizeSearch(i.code).includes(norm)
    );
  }, [items, searchItem]);

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setShowDropdown(false);
    setSearchItem("");
  };

  const clearSelectedItem = () => {
    setSelectedItem(null);
    setAddQty("");
    setAddPrice("");
  };

  const addToCart = () => {
    if (!selectedItem || !addQty || addQty <= 0) return;
    // Allow empty or 0 price (will default to 0)
    const finalPrice = typeof addPrice === "number" ? addPrice : 0;
    setCart((prev) => [
      ...prev,
      {
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        itemCode: selectedItem.code,
        itemUnit: selectedItem.unit,
        quantity: addQty,
        unitPrice: finalPrice,
      },
    ]);
    clearSelectedItem();
  };

  const removeFromCart = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  const cartTotal = cart.reduce((s, c) => s + c.quantity * c.unitPrice, 0);

  const handleSubmitAcquisition = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);

    let invoiceUrl = "";
    let invoiceFilename = "";
    let invoiceStoragePath = "";

    if (invoiceFile) {
      const formData = new FormData();
      formData.append("file", invoiceFile);
      const upRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const upData = await upRes.json();

      if (!upRes.ok) {
        setSubmitting(false);
        setToast({
          message: upData.error ?? "Nao foi possivel enviar a nota fiscal.",
          type: "error",
        });
        return;
      }

      invoiceUrl = upData.url;
      invoiceFilename = upData.filename;
      invoiceStoragePath = upData.storagePath;
    }

    const effectiveAcqDate = useManualAcqDate
      ? new Date(acqDate).toISOString()
      : new Date().toISOString();

    await fetch("/api/acquisitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: effectiveAcqDate,
        invoiceUrl: invoiceUrl || undefined,
        invoiceFilename: invoiceFilename || undefined,
        invoiceStoragePath: invoiceStoragePath || undefined,
        cartItems: cart.map((c) => ({
          itemId: c.itemId,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
        })),
      }),
    });

    setCart([]);
    setUseManualAcqDate(false);
    setAcqDate(nowDateTimeLocal());
    setInvoiceFile(null);
    setSubmitting(false);
    setToast({ message: "Aquisição registrada com sucesso!", type: "success" });
    fetchAcquisitions();
    fetchItems();
  };

  const filteredAcquisitions = useMemo(() => {
    return acquisitions.filter((acq) => {
      const dayKey = getDateKey(acq.date);
      if (startDate && dayKey < startDate) return false;
      if (endDate && dayKey > endDate) return false;
      return true;
    });
  }, [acquisitions, startDate, endDate]);

  const paginatedAcqs = filteredAcquisitions.slice(
    (historyPage - 1) * historyPerPage,
    historyPage * historyPerPage
  );
  const totalHistoryPages = Math.max(1, Math.ceil(filteredAcquisitions.length / historyPerPage));

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="text-center lg:text-left">
        <h2 className="text-2xl font-bold text-white">Aquisição</h2>
        <p className="text-slate-400 text-sm mt-1">
          {canManageStock
            ? "Registre entradas de itens no estoque"
            : "Consulte o historico de entradas do estoque"}
        </p>
      </div>

      {/* New Acquisition Form */}
      {canManageStock ? (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6">
        <h3 className="text-lg font-semibold text-white">Nova Aquisição</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Data da Aquisição
              </label>
              {useManualAcqDate ? (
                <input
                  type="datetime-local"
                  value={acqDate}
                  onChange={(e) => setAcqDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              ) : (
                <div className="px-3 py-2.5 bg-slate-800/40 border border-slate-800 rounded-lg text-sm text-slate-500 cursor-not-allowed select-none">
                  {formatLiveDateTime(liveNow)}
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useManualAcqDate}
                onChange={(e) => {
                  setUseManualAcqDate(e.target.checked);
                  if (!e.target.checked) setAcqDate(nowDateTimeLocal());
                }}
                className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
              />
              Inserir data/hora manualmente
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nota Fiscal
            </label>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center justify-center w-11 h-11 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:border-slate-600 cursor-pointer transition-colors">
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </label>
              {invoiceFile ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-slate-400 truncate max-w-40">
                    {invoiceFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setInvoiceFile(null)}
                    className="text-slate-500 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-500">Sem arquivo</span>
              )}
            </div>
          </div>
        </div>

        {/* Add item */}
        <div className="border-t border-slate-800 pt-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3">
            Adicionar Item
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Item Selection */}
            <div className="relative sm:col-span-2 lg:col-span-1">
              {selectedItem ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-500/15 border border-blue-500/30 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <span className="text-blue-400 font-mono text-xs">{selectedItem.code}</span>
                    <span className="text-white text-sm ml-1.5 truncate">{selectedItem.name}</span>
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
                <>
                  <input
                    value={searchItem}
                    onChange={(e) => {
                      setSearchItem(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Buscar item..."
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  {showDropdown && searchItem && (
                    <div className="absolute z-20 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg max-h-48 overflow-y-auto shadow-xl">
                      {loadingItems ? (
                        <div className="px-3 py-4 flex justify-center">
                          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : filteredItems.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-slate-500">
                          Nenhum item encontrado
                        </p>
                      ) : (
                        filteredItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleSelectItem(item)}
                            className="w-full text-left px-3 py-2 hover:bg-slate-700 text-sm text-white transition-colors"
                          >
                            <span className="text-blue-400 font-mono text-xs">
                              {item.code}
                            </span>{" "}
                            {item.name}{" "}
                            <span className="text-slate-500 text-xs">({item.unit.toLowerCase()})</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <div>
              <input
                type="number"
                min={1}
                value={addQty}
                onChange={(e) => setAddQty(e.target.value ? parseInt(e.target.value) : "")}
                placeholder="Quantidade"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <input
                type="number"
                min={0}
                step={0.01}
                value={addPrice}
                onChange={(e) =>
                  setAddPrice(e.target.value ? parseFloat(e.target.value) : "")
                }
                placeholder="R$ Valor Unitário"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <button
                onClick={addToCart}
                disabled={!selectedItem || !addQty || addQty <= 0}
                className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div className="border-t border-slate-800 pt-4">
            <h4 className="text-sm font-medium text-slate-300 mb-3">
              Carrinho ({cart.length} {cart.length === 1 ? "item" : "itens"})
            </h4>
            <div className="space-y-2">
              {cart.map((c, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3"
                >
                  <div>
                    <span className="text-blue-400 font-mono text-xs">
                      {c.itemCode}
                    </span>
                    <span className="text-white ml-2">{c.itemName}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-300">
                      {c.quantity} {pluralizeUnit(c.itemUnit, c.quantity)} × R$ {c.unitPrice.toFixed(2)}
                    </span>
                    <span className="text-sm text-white font-medium">
                      R$ {(c.quantity * c.unitPrice).toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeFromCart(idx)}
                      className="p-1 text-rose-400 hover:text-rose-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
              <span className="text-lg font-semibold text-white">Total:</span>
              <span className="text-lg font-bold text-emerald-400">
                R$ {cartTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-center lg:justify-end mt-4">
              <button
                onClick={handleSubmitAcquisition}
                disabled={submitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {submitting
                  ? "Processando..."
                  : "Confirmar Aquisição"}
              </button>
            </div>
          </div>
        )}
      </div>

      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-400">
          Seu perfil permite visualizar o historico de aquisicoes, mas nao registrar novas entradas.
        </div>
      )}

      {/* History Toggle */}
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
          Histórico de Aquisições ({filteredAcquisitions.length})
        </button>
      </div>

      {/* History */}
      {showHistory && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
          {/* Date Filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Data Inicial
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setHistoryPage(1); }}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Data Final
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setHistoryPage(1); }}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(""); setEndDate(""); setHistoryPage(1); }}
                className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Acquisitions List */}
          {loadingAcq ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredAcquisitions.length === 0 ? (
            <p className="text-center py-8 text-slate-500">
              Nenhuma aquisição encontrada
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {paginatedAcqs.map((acq) => (
                  <button
                    key={acq.id}
                    onClick={() => setSelectedAcqId(acq.id)}
                    className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-800/50 rounded-lg p-3 hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-white font-medium">
                        #{acq.id}
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">
                          {new Date(acq.date).toLocaleDateString("pt-BR")}
                        </span>
                        <span className="text-slate-600">
                          {new Date(acq.date).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {acq.invoiceUrl ? (
                        <span className="text-emerald-500/60 flex items-center gap-1" title="Nota fiscal anexada">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-[10px] uppercase tracking-wider font-medium">NF</span>
                        </span>
                      ) : (
                        <span className="text-amber-500/70 flex items-center gap-1" title="Sem nota fiscal">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-[10px] uppercase tracking-wider font-medium">NF</span>
                        </span>
                      )}
                      <span className="text-emerald-400 font-semibold text-sm">
                        R$ {parseFloat(acq.totalValue).toFixed(2)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              
              {/* Pagination */}
              {totalHistoryPages > 1 && (
                <div className="flex items-center justify-center gap-1 text-xs">
                  <button
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 disabled:opacity-40"
                  >
                    ‹
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
                    ›
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Invoice Preview Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          imageUrl={previewInvoice.url}
          filename={previewInvoice.filename}
          onClose={() => setPreviewInvoice(null)}
        />
      )}

      {/* Acquisition Detail Modal */}
      {selectedAcqId && (
        <AcquisitionDetailModal
          acquisitionId={selectedAcqId}
          onClose={() => setSelectedAcqId(null)}
          onPreviewInvoice={(url, filename) => setPreviewInvoice({ url, filename })}
          canManageStock={canManageStock}
          canDeleteInvoice={canDeleteInvoice}
          onInvoiceChanged={fetchAcquisitions}
          onToast={setToast}
        />
      )}
    </div>
  );
}
