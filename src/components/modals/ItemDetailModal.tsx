"use client";

import { useEffect, useMemo, useState } from "react";
import { Item, pluralizeUnit, formatLimit } from "@/types/stock";
import { includeCurrentCategory, includeCurrentUnit } from "@/lib/stock-catalog";
import { useStockCatalog } from "@/lib/use-stock-catalog";
import { useActionCursor } from "@/lib/use-action-cursor";
import { StatusBadge } from "@/components/ui/Badge";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  item: Item;
  onClose: () => void;
  onUpdate: () => void;
  canManageStock: boolean;
  isAdmin?: boolean;
}

type AcqHistoryItem = { quantity: number; unitPrice: string; totalPrice: string; date: string; balanceAfter: number };
type IssueHistoryItem = { id: number; quantity: number; date: string; reason: string | null; balanceAfter: number };
type ProductChartPoint = {
  xKey: string;
  date: string;
  label: string;
  value: number;
  type?: "Aquisição" | "Baixa";
  quantity?: number;
  balanceAfter?: number;
};

export function ItemDetailModal({ item, onClose, onUpdate, canManageStock, isAdmin = false }: Props) {
  const [editing, setEditing] = useState(false);
  const [formName, setFormName] = useState(item.name);
  const [formCategory, setFormCategory] = useState(item.category);
  const [formUnit, setFormUnit] = useState(item.unit);
  const [formMinLimit, setFormMinLimit] = useState<number | "">(item.minimumLimit);
  const [formDesiredLimit, setFormDesiredLimit] = useState<number | "">(item.desiredLimit);
  const [formBrand, setFormBrand] = useState(item.brand || "");
  const [formAdditionalUnit, setFormAdditionalUnit] = useState(item.additionalUnit || "");
  const [formObs, setFormObs] = useState(item.observations || "");
  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState("");
  const [acqHistory, setAcqHistory] = useState<AcqHistoryItem[]>([]);
  const [issueHistory, setIssueHistory] = useState<IssueHistoryItem[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [chartStartDate, setChartStartDate] = useState("");
  const [chartEndDate, setChartEndDate] = useState("");
  const { catalog } = useStockCatalog();
  useActionCursor(submitting);

  const categoryOptions = useMemo(() => includeCurrentCategory(catalog.categories, formCategory), [catalog.categories, formCategory]);
  const unitOptions = useMemo(() => includeCurrentUnit(catalog.units, formUnit), [catalog.units, formUnit]);
  const additionalUnitOptions = useMemo(() => includeCurrentUnit(catalog.units, formAdditionalUnit), [catalog.units, formAdditionalUnit]);
  const stockChartData = useMemo<ProductChartPoint[]>(() => {
    const points = [
      ...acqHistory.map((entry) => ({
        date: entry.date,
        label: new Date(entry.date).toLocaleDateString("pt-BR"),
        value: entry.balanceAfter,
        type: "Aquisição" as const,
        quantity: entry.quantity,
        balanceAfter: entry.balanceAfter,
      })),
      ...issueHistory.map((entry) => ({
        date: entry.date,
        label: new Date(entry.date).toLocaleDateString("pt-BR"),
        value: entry.balanceAfter,
        type: "Baixa" as const,
        quantity: -entry.quantity,
        balanceAfter: entry.balanceAfter,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return withUniqueChartKeys(points);
  }, [acqHistory, issueHistory]);
  const valueChartData = useMemo<ProductChartPoint[]>(() => {
    const points = [...acqHistory]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((entry) => ({
        date: entry.date,
        label: new Date(entry.date).toLocaleDateString("pt-BR"),
        value: Number(entry.unitPrice),
      }));
    return withUniqueChartKeys(points);
  }, [acqHistory]);
  const filteredStockChartData = useMemo(
    () => filterChartDataByDate(stockChartData, chartStartDate, chartEndDate),
    [stockChartData, chartStartDate, chartEndDate]
  );
  const filteredValueChartData = useMemo(
    () => filterChartDataByDate(valueChartData, chartStartDate, chartEndDate),
    [valueChartData, chartStartDate, chartEndDate]
  );
  const hasChartDateFilter = Boolean(chartStartDate || chartEndDate);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoadingDetail(true);
      fetch(`/api/items/${item.id}`).then((res) => res.json()).then((data) => {
        if (!active) return;
        setAcqHistory(data.acquisitionHistory || []);
        setIssueHistory(data.issueHistory || []);
        setLoadingDetail(false);
      });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [item.id]);

  const handleSave = async () => {
    if (!canManageStock) return;
    if (formMinLimit === "" || formDesiredLimit === "" || Number(formDesiredLimit) < Number(formMinLimit)) {
      setEditError("O limite desejável deve ser maior ou igual ao limite mínimo.");
      return;
    }
    setEditError("");
    setSubmitting(true);
    const response = await fetch("/api/items", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, name: formName, category: formCategory, unit: formUnit, minimumLimit: formMinLimit, desiredLimit: formDesiredLimit, brand: formBrand || null, additionalUnit: formAdditionalUnit || null, observations: formObs || null }) });
    const payload = await response.json().catch(() => null);
    setSubmitting(false);
    if (!response.ok) { setEditError(payload?.error ?? "Não foi possível salvar o produto."); return; }
    setEditing(false);
    onUpdate();
  };

  const handleDelete = async () => {
    if (!isAdmin) return;
    const confirmed = window.confirm(`Excluir o produto "${item.name}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    const response = await fetch(`/api/items/${item.id}`, { method: "DELETE" });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      window.alert(payload?.error ?? "Não foi possível excluir o produto.");
      return;
    }

    onUpdate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className="max-h-[88dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl sm:max-h-[90vh]" onClick={(event) => event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800 bg-slate-900 p-4 sm:p-6">
          <div>
            <p className="font-mono text-sm text-blue-400">{item.code}</p>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{editing ? "Editar produto" : item.name}</h2>
              {!editing && canManageStock ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label="Editar produto"
                  title="Editar produto"
                  className="rounded-lg border border-slate-700 p-2 text-slate-400 transition-colors hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 7.125L16.875 4.5" />
                  </svg>
                </button>
              ) : null}
              {!editing && isAdmin ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  aria-label="Excluir produto"
                  title="Excluir produto"
                  className="rounded-lg border border-slate-700 p-2 text-slate-400 transition-colors hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0115.916 21.75H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-2xl leading-none text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">×</button>
        </div>
        <div className="space-y-6 p-4 pb-12 sm:pb-6 sm:p-6">
          {editing && canManageStock ? (
            <div className="space-y-4">
              {editError ? <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{editError}</p> : null}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nome"><input value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500" /></Field>
                <Field label="Categoria"><select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500">{categoryOptions.map((category) => <option key={`${category.id}-${category.name}`} value={category.name}>{category.name}</option>)}</select></Field>
                <Field label="Unidade de Medida"><select value={formUnit} onChange={(e) => setFormUnit(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500">{unitOptions.map((unit) => <option key={`${unit.id}-${unit.name}`} value={unit.name}>{unit.name}</option>)}</select></Field>
                <Field label="Unidade Adicional"><select value={formAdditionalUnit} onChange={(e) => setFormAdditionalUnit(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"><option value="">Nenhuma</option>{additionalUnitOptions.map((unit) => <option key={`${unit.id}-${unit.name}`} value={unit.name}>{unit.name}</option>)}</select></Field>
                <Field label="Limite Mínimo"><input type="number" min={0} value={formMinLimit} onChange={(e) => setFormMinLimit(e.target.value ? parseInt(e.target.value, 10) : "")} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500" /></Field>
                <Field label="Limite Desejável"><input type="number" min={formMinLimit === "" ? 0 : formMinLimit} value={formDesiredLimit} onChange={(e) => setFormDesiredLimit(e.target.value ? parseInt(e.target.value, 10) : "")} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500" /></Field>
                <Field label="Marca"><input value={formBrand} onChange={(e) => setFormBrand(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500" /></Field>
              </div>
              <Field label="Observações"><textarea value={formObs} onChange={(e) => setFormObs(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 resize-none" /></Field>
              <div className="flex justify-end gap-3"><button onClick={() => setEditing(false)} className="rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white">Cancelar</button><button onClick={handleSave} disabled={submitting} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50 disabled:opacity-50">{submitting ? "Salvando..." : "Salvar alterações"}</button></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3">
                <Info label="Status"><StatusBadge quantity={item.quantity} minimumLimit={item.minimumLimit} desiredLimit={item.desiredLimit} /></Info>
                <Info label="Saldo"><span className="text-lg font-semibold text-white">{item.quantity} {pluralizeUnit(item.unit, item.quantity, catalog.units)}</span></Info>
                <Info label="Categoria">{item.category}</Info>
                <Info label="Limite Mínimo">{formatLimit(item.minimumLimit)}</Info>
                <Info label="Limite Desejável">{formatLimit(item.desiredLimit)}</Info>
                {item.brand ? <Info label="Marca">{item.brand}</Info> : null}
                {item.additionalUnit ? <Info label="Unidade Adicional">{item.additionalUnit}</Info> : null}
              </div>
              {item.observations ? <Info label="Observações">{item.observations}</Info> : null}
              {loadingDetail ? <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" /></div> : <><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><ProductLineChart title="Histórico de Valor" data={filteredValueChartData} color="#22d3ee" unit={item.unit} units={catalog.units} kind="value" /><ProductLineChart title="Histórico de Estoque" data={filteredStockChartData} color="#facc15" unit={item.unit} units={catalog.units} kind="stock" /></div><ChartDateFilters startDate={chartStartDate} endDate={chartEndDate} onStartDateChange={setChartStartDate} onEndDateChange={setChartEndDate} onClear={() => { setChartStartDate(""); setChartEndDate(""); }} active={hasChartDateFilter} /><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><History title="Histórico de Aquisições" rows={acqHistory.map((a) => ({ left: `+${a.quantity}`, middle: new Date(a.date).toLocaleDateString("pt-BR"), right: `R$ ${Number(a.unitPrice).toFixed(2)} | Saldo: ${a.balanceAfter}` }))} /><History title="Histórico de Baixas" rows={issueHistory.map((s) => ({ left: `-${s.quantity}`, middle: new Date(s.date).toLocaleDateString("pt-BR"), right: `Saldo: ${s.balanceAfter}${s.reason ? ` | ${s.reason}` : ""}` }))} /></div></>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-medium text-slate-300"><span className="mb-1 block">{label}</span>{children}</label>; }
function Info({ label, children }: { label: string; children: React.ReactNode }) { return <div><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><div className="mt-1 text-slate-300">{children}</div></div>; }
function withUniqueChartKeys(points: Array<Omit<ProductChartPoint, "xKey">>) { return points.map((point, index) => ({ ...point, xKey: `${point.date}-${index}` })); }
function filterChartDataByDate(data: ProductChartPoint[], startDate: string, endDate: string) { return data.filter((point) => { const key = new Date(point.date).toISOString().slice(0, 10); if (startDate && key < startDate) return false; if (endDate && key > endDate) return false; return true; }); }
function ChartDateFilters({ startDate, endDate, onStartDateChange, onEndDateChange, onClear, active }: { startDate: string; endDate: string; onStartDateChange: (value: string) => void; onEndDateChange: (value: string) => void; onClear: () => void; active: boolean }) { return <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2"><label className="block text-sm font-medium text-slate-300"><span className="mb-1 block text-xs uppercase tracking-wider text-slate-500">Data inicial</span><input type="date" value={startDate} onChange={(event) => onStartDateChange(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500" /></label><label className="block text-sm font-medium text-slate-300"><span className="mb-1 block text-xs uppercase tracking-wider text-slate-500">Data final</span><input type="date" value={endDate} onChange={(event) => onEndDateChange(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500" /></label></div>{active ? <button type="button" onClick={onClear} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white">Limpar período</button> : null}</div></div>; }
function ProductLineChart({ title, data, color, unit, units, kind }: { title: string; data: ProductChartPoint[]; color: string; unit: string; units: Parameters<typeof pluralizeUnit>[2]; kind: "stock" | "value" }) { return <div><h3 className="mb-3 text-sm font-medium text-slate-300">{title}</h3><div className="h-44 rounded-lg bg-slate-800/50 px-2 py-3">{data.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -22 }}><CartesianGrid stroke="#334155" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="xKey" tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#475569" }} minTickGap={18} tickFormatter={(_, index) => data[index]?.label ?? ""} /><YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(value) => String(value)} /><Tooltip cursor={{ stroke: "#64748b", strokeWidth: 1 }} content={({ active, payload, label }) => <ProductChartTooltip active={active} payload={payload as unknown as ReadonlyArray<{ payload?: ProductChartPoint }> | undefined} label={String(label ?? "")} unit={unit} units={units} kind={kind} />} /><Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 3, stroke: color, strokeWidth: 2, fill: "#0f172a" }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-500">Sem dados para exibir</div>}</div></div>; }
function ProductChartTooltip({ active, payload, unit, units, kind }: { active?: boolean; payload?: ReadonlyArray<{ payload?: ProductChartPoint }>; label: string; unit: string; units: Parameters<typeof pluralizeUnit>[2]; kind: "stock" | "value" }) { const point = payload?.[0]?.payload; if (!active || !point) return null; const quantity = point.quantity ?? 0; const quantityText = `${quantity > 0 ? "+" : ""}${quantity} ${pluralizeUnit(unit, Math.abs(quantity), units)}`; return <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200 shadow-xl"><p className="mb-1 font-medium text-white">{point.label}</p>{kind === "stock" ? <><p><span className="text-slate-400">Movimentação:</span> <span className={quantity >= 0 ? "text-emerald-300" : "text-rose-300"}>{quantityText}</span></p><p><span className="text-slate-400">Saldo:</span> {point.balanceAfter ?? point.value} {pluralizeUnit(unit, point.balanceAfter ?? point.value, units)}</p></> : <p><span className="text-slate-400">Valor:</span> R$ {point.value.toFixed(2)}</p>}</div>; }
function History({ title, rows }: { title: string; rows: Array<{ left: string; middle: string; right: string }> }) { return <div><h3 className="mb-3 text-sm font-medium text-slate-300">{title}</h3>{rows.length ? <div className="space-y-2">{rows.map((row, index) => <div key={index} className="rounded-lg bg-slate-800/50 px-3 py-2 text-sm"><div className="flex items-center justify-between gap-3"><span className="font-medium text-blue-300">{row.left}</span><span className="text-slate-400">{row.middle}</span></div><p className="mt-1 text-xs text-slate-500">{row.right}</p></div>)}</div> : <p className="text-sm text-slate-500">Nenhum registro.</p>}</div>; }



