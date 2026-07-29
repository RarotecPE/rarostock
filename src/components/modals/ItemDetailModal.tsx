"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Item,
  CATEGORIES,
  UNITS,
  pluralizeUnit,
  formatMinimumLimit,
} from "@/types/stock";
import { StatusBadge, TypeBadge } from "@/components/ui/Badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Props {
  item: Item;
  onClose: () => void;
  onUpdate: () => void;
  canManageStock: boolean;
}

interface AcqHistoryItem {
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  date: string;
  createdAt: string;
  balanceAfter: number;
}

interface IssueHistoryItem {
  id: number;
  quantity: number;
  date: string;
  createdAt: string;
  reason: string | null;
  balanceAfter: number;
}

interface PriceDataPoint {
  id: number;
  date: string;
  dateRaw: Date;
  unitPrice: number;
  dateTime: string;
}

interface BalanceDataPoint {
  id: number;
  date: string;
  dateRaw: Date;
  balance: number;
  type: "acquisition" | "issue";
  quantity: number;
}

type ChartMode = "price" | "balance";

export function ItemDetailModal({ item, onClose, onUpdate, canManageStock }: Props) {
  const [editing, setEditing] = useState(false);
  const [formName, setFormName] = useState(item.name);
  const [formCategory, setFormCategory] = useState(item.category);
  const [formUnit, setFormUnit] = useState(item.unit);
  const [formMinLimit, setFormMinLimit] = useState<number | "">(
    item.minimumLimit ?? ""
  );
  const [formBrand, setFormBrand] = useState(item.brand || "");
  const [formAdditionalUnit, setFormAdditionalUnit] = useState(item.additionalUnit || "");
  const [formObs, setFormObs] = useState(item.observations || "");
  const [submitting, setSubmitting] = useState(false);

  const [acqHistory, setAcqHistory] = useState<AcqHistoryItem[]>([]);
  const [issueHistory, setIssueHistory] = useState<IssueHistoryItem[]>([]);
  const [priceData, setPriceData] = useState<PriceDataPoint[]>([]);
  const [balanceData, setBalanceData] = useState<BalanceDataPoint[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [chartMode, setChartMode] = useState<ChartMode>("price");

  // Chart filters
  const [chartStartDate, setChartStartDate] = useState("");
  const [chartEndDate, setChartEndDate] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      setLoadingDetail(true);
      const res = await fetch(`/api/items/${item.id}`);
      const data = await res.json();
      setAcqHistory(data.acquisitionHistory || []);
      setIssueHistory(data.issueHistory || []);

      // Build price chart data - each entry gets unique id for same-day differentiation
      // Exclude items with price 0 (promotional items like "buy 2 get 3")
      const prices: PriceDataPoint[] = (data.acquisitionHistory || [])
        .filter((a: AcqHistoryItem) => parseFloat(a.unitPrice) > 0)
        .map((a: AcqHistoryItem, idx: number) => {
          const d = new Date(a.date);
          return {
            id: idx,
            date: d.toLocaleDateString("pt-BR"),
            dateRaw: d,
            unitPrice: parseFloat(a.unitPrice),
            dateTime: d.toLocaleString("pt-BR"),
          };
        })
        .reverse();
      setPriceData(prices);

      // Build balance history from both acq and issue histories
      // Both come from API sorted desc; we need chronological asc
      const acqAsc = [...(data.acquisitionHistory || [])].reverse() as AcqHistoryItem[];
      const issAsc = [...(data.issueHistory || [])].reverse() as IssueHistoryItem[];

      const balPoints: BalanceDataPoint[] = [];
      let bIdx = 0;
      for (const a of acqAsc) {
        balPoints.push({
          id: bIdx++,
          date: new Date(a.date).toLocaleDateString("pt-BR"),
          dateRaw: new Date(a.date),
          balance: a.balanceAfter,
          type: "acquisition",
          quantity: a.quantity,
        });
      }
      for (const s of issAsc) {
        balPoints.push({
          id: bIdx++,
          date: new Date(s.createdAt).toLocaleDateString("pt-BR"),
          dateRaw: new Date(s.createdAt),
          balance: s.balanceAfter,
          type: "issue",
          quantity: s.quantity,
        });
      }
      balPoints.sort((a, b) => a.dateRaw.getTime() - b.dateRaw.getTime());
      // Re-index after sort
      balPoints.forEach((p, i) => { p.id = i; });
      setBalanceData(balPoints);

      setLoadingDetail(false);
    };
    fetchDetail();
  }, [item.id]);

  // Filtered price data for chart
  const filteredPriceData = useMemo(() => {
    let data = priceData;
    if (chartStartDate) {
      const start = new Date(chartStartDate);
      data = data.filter((d) => d.dateRaw >= start);
    }
    if (chartEndDate) {
      const end = new Date(chartEndDate);
      end.setHours(23, 59, 59, 999);
      data = data.filter((d) => d.dateRaw <= end);
    }
    return data;
  }, [priceData, chartStartDate, chartEndDate]);

  // Price statistics
  const priceStats = useMemo(() => {
    if (filteredPriceData.length === 0) return null;
    const prices = filteredPriceData.map((d) => d.unitPrice);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    return { min, max, avg };
  }, [filteredPriceData]);

  // Filtered balance data
  const filteredBalanceData = useMemo(() => {
    let data = balanceData;
    if (chartStartDate) {
      const start = new Date(chartStartDate);
      data = data.filter((d) => d.dateRaw >= start);
    }
    if (chartEndDate) {
      const end = new Date(chartEndDate);
      end.setHours(23, 59, 59, 999);
      data = data.filter((d) => d.dateRaw <= end);
    }
    return data;
  }, [balanceData, chartStartDate, chartEndDate]);

  // Balance statistics
  const balanceStats = useMemo(() => {
    if (filteredBalanceData.length === 0) return null;
    const vals = filteredBalanceData.map((d) => d.balance);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { min, max, avg };
  }, [filteredBalanceData]);

  const handleSave = async () => {
    if (!canManageStock) return;

    setSubmitting(true);
    await fetch("/api/items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: item.id,
        name: formName,
        category: formCategory,
        unit: formUnit,
        minimumLimit:
          item.type === "Item de Consumo"
            ? (formMinLimit === "" ? 0 : formMinLimit)
            : null,
        brand: formBrand || null,
        additionalUnit: formAdditionalUnit || null,
        observations: formObs || null,
      }),
    });
    setSubmitting(false);
    setEditing(false);
    onUpdate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between z-10">
          <div>
            <p className="text-sm text-blue-400 font-mono">{item.code}</p>
            <h2 className="text-xl font-bold text-white">
              {editing ? "Editar Item" : item.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {editing && canManageStock ? (
            /* Edit Form */
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Nome
                  </label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Unidade de Medida Adicional
                  </label>
                  <select
                    value={formAdditionalUnit}
                    onChange={(e) => setFormAdditionalUnit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Nenhuma</option>
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Tipo do Item
                  </label>
                  <input
                    value={item.type}
                    disabled
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    O tipo não pode ser alterado
                  </p>
                </div>
                {item.type === "Item de Consumo" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Limite Mínimo
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={formMinLimit}
                      onChange={(e) =>
                        setFormMinLimit(parseInt(e.target.value) || 0)
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Marca
                  </label>
                  <input
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: Dell, HP, Samsung..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Observações
                </label>
                <textarea
                  value={formObs}
                  onChange={(e) => setFormObs(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 text-slate-300 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {submitting ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Item Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Tipo
                  </p>
                  <div className="mt-1">
                    <TypeBadge type={item.type} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Status
                  </p>
                  <div className="mt-1">
                    <StatusBadge
                      quantity={item.quantity}
                      minimumLimit={item.minimumLimit}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Saldo
                  </p>
                  <p className="text-white text-lg font-semibold">
                    {item.quantity} {pluralizeUnit(item.unit, item.quantity)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Categoria
                  </p>
                  <p className="text-slate-300">{item.category}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Limite Mínimo
                  </p>
                  <p className="text-slate-300">{formatMinimumLimit(item.minimumLimit)}</p>
                </div>
                {item.brand && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                      Marca
                    </p>
                    <p className="text-slate-300">{item.brand}</p>
                  </div>
                )}
                {item.additionalUnit && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                      Unidade Adicional
                    </p>
                    <p className="text-slate-300">{item.additionalUnit}</p>
                  </div>
                )}
              </div>
              {item.observations && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Observações
                  </p>
                  <p className="text-slate-300 mt-1">{item.observations}</p>
                </div>
              )}
              {canManageStock && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors border border-slate-700"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar
                  </span>
                </button>
              )}

              {/* Price History Chart */}
              {loadingDetail ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {(priceData.length > 0 || balanceData.length > 0) && (
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                        <h3 className="text-sm font-medium text-slate-300">
                          {chartMode === "price"
                            ? "Histórico de Preços (Valor Unitário)"
                            : "Histórico de Saldo (Item)"}
                        </h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setChartMode(chartMode === "price" ? "balance" : "price")}
                            className={`p-1.5 rounded border transition-colors ${
                              chartMode === "balance"
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                                : chartMode === "price"
                                  ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                            }`}
                            title={chartMode === "price" ? "Trocar para Histórico de Saldo" : "Trocar para Histórico de Preços"}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h11m0 0l-3-3m3 3l-3 3M20 17H9m0 0l3-3m-3 3l3 3" />
                            </svg>
                          </button>
                          <input
                            type="date"
                            value={chartStartDate}
                            onChange={(e) => setChartStartDate(e.target.value)}
                            className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-white"
                          />
                          <span className="text-slate-500 text-xs">até</span>
                          <input
                            type="date"
                            value={chartEndDate}
                            onChange={(e) => setChartEndDate(e.target.value)}
                            className="px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-white"
                          />
                          {(chartStartDate || chartEndDate) && (
                            <button
                              onClick={() => {
                                setChartStartDate("");
                                setChartEndDate("");
                              }}
                              className="text-xs text-slate-400 hover:text-white"
                            >
                              Limpar
                            </button>
                          )}
                        </div>
                      </div>

                      {chartMode === "price" ? (
                        <>
                          {/* Price Stats */}
                          {priceStats && (
                            <div className="grid grid-cols-3 gap-3 mb-3">
                              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs text-emerald-400">Mínimo</p>
                                <p className="text-sm font-semibold text-emerald-300">
                                  R$ {priceStats.min.toFixed(2)}
                                </p>
                              </div>
                              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs text-blue-400">Médio</p>
                                <p className="text-sm font-semibold text-blue-300">
                                  R$ {priceStats.avg.toFixed(2)}
                                </p>
                              </div>
                              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs text-rose-400">Máximo</p>
                                <p className="text-sm font-semibold text-rose-300">
                                  R$ {priceStats.max.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          )}

                          {filteredPriceData.length > 0 ? (
                            <div className="bg-slate-800/50 rounded-lg p-4 h-56">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={filteredPriceData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                  <XAxis
                                    dataKey="id"
                                    stroke="#64748b"
                                    fontSize={11}
                                    tickFormatter={(_, index) => filteredPriceData[index]?.date || ""}
                                  />
                                  <YAxis stroke="#64748b" fontSize={11} />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: "#1e293b",
                                      border: "1px solid #334155",
                                      borderRadius: "8px",
                                      color: "#e2e8f0",
                                    }}
                                    formatter={(value) => [
                                      `R$ ${Number(value).toFixed(2)}`,
                                      "Valor Unitário",
                                    ]}
                                    labelFormatter={(_, payload) => {
                                      if (payload && payload[0]) {
                                        const point = payload[0].payload as PriceDataPoint;
                                        return `Data: ${point.date}`;
                                      }
                                      return "";
                                    }}
                                  />
                                  {priceStats && (
                                    <ReferenceLine
                                      y={priceStats.avg}
                                      stroke="#3b82f6"
                                      strokeDasharray="5 5"
                                      label={{
                                        value: "Média",
                                        fill: "#60a5fa",
                                        fontSize: 10,
                                      }}
                                    />
                                  )}
                                  <Line
                                    type="monotone"
                                    dataKey="unitPrice"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={{ fill: "#3b82f6", r: 4 }}
                                    activeDot={{ r: 6, fill: "#60a5fa" }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <p className="text-center text-slate-500 py-4 text-sm">
                              Sem dados de preço no período
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Balance Stats */}
                          {balanceStats && (
                            <div className="grid grid-cols-3 gap-3 mb-3">
                              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs text-rose-400">Mínimo</p>
                                <p className="text-sm font-semibold text-rose-300">
                                  {balanceStats.min}
                                </p>
                              </div>
                              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs text-blue-400">Médio</p>
                                <p className="text-sm font-semibold text-blue-300">
                                  {Math.round(balanceStats.avg)}
                                </p>
                              </div>
                              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs text-emerald-400">Máximo</p>
                                <p className="text-sm font-semibold text-emerald-300">
                                  {balanceStats.max}
                                </p>
                              </div>
                            </div>
                          )}

                          {filteredBalanceData.length > 0 ? (
                            <div className="bg-slate-800/50 rounded-lg p-4 h-56">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={filteredBalanceData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                  <XAxis
                                    dataKey="id"
                                    stroke="#64748b"
                                    fontSize={11}
                                    tickFormatter={(_, index) => filteredBalanceData[index]?.date || ""}
                                  />
                                  <YAxis stroke="#64748b" fontSize={11} />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: "#1e293b",
                                      border: "1px solid #334155",
                                      borderRadius: "8px",
                                      color: "#e2e8f0",
                                    }}
                                    formatter={(value, _, entry) => {
                                      const pt = entry.payload as BalanceDataPoint;
                                      const sign = pt.type === "acquisition" ? "+" : "-";
                                      const label = pt.type === "acquisition" ? "Aquisição" : "Baixa";
                                      return [
                                        `${Number(value)} (${label}: ${sign}${pt.quantity})`,
                                        "Saldo",
                                      ];
                                    }}
                                    labelFormatter={(_, payload) => {
                                      if (payload && payload[0]) {
                                        const point = payload[0].payload as BalanceDataPoint;
                                        return `Data: ${point.date}`;
                                      }
                                      return "";
                                    }}
                                  />
                                  {balanceStats && (
                                    <ReferenceLine
                                      y={balanceStats.avg}
                                      stroke="#10b981"
                                      strokeDasharray="5 5"
                                      label={{
                                        value: "Média",
                                        fill: "#34d399",
                                        fontSize: 10,
                                      }}
                                    />
                                  )}
                                  <Line
                                    type="monotone"
                                    dataKey="balance"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={{ fill: "#10b981", r: 4 }}
                                    activeDot={{ r: 6, fill: "#34d399" }}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <p className="text-center text-slate-500 py-4 text-sm">
                              Sem dados de saldo no período
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Acquisition History */}
                  {acqHistory.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-300 mb-3">
                        Histórico de Aquisições
                      </h3>
                      <div className="space-y-2">
                        {acqHistory.map((a, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-2.5"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-emerald-400 text-sm font-medium w-10">
                                +{a.quantity}
                              </span>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-slate-400">
                                  {new Date(a.date).toLocaleDateString("pt-BR")}
                                </span>
                                <span className="text-slate-600">
                                  {new Date(a.date).toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-white">
                                R$ {parseFloat(a.unitPrice).toFixed(2)} /un
                              </span>
                              <span className="text-xs text-slate-500">
                                Saldo: <span className="text-slate-300">{a.balanceAfter}</span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Issue History */}
                  {issueHistory.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-300 mb-3">
                        Histórico de Baixas
                      </h3>
                      <div className="space-y-2">
                        {issueHistory.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-2.5"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-rose-400 text-sm font-medium w-10">
                                -{s.quantity}
                              </span>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-slate-400">
                                  {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                                </span>
                                <span className="text-slate-600">
                                  {new Date(s.createdAt).toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs text-slate-500">
                              Saldo: <span className="text-slate-300">{s.balanceAfter}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {acqHistory.length === 0 && issueHistory.length === 0 && (
                    <p className="text-center text-slate-500 py-4">
                      Nenhuma movimentação registrada
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
