"use client";

import { useState } from "react";
import Link from "next/link";
import { useStockCatalog } from "@/lib/use-stock-catalog";
import { useActionCursor } from "@/lib/use-action-cursor";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { Toast } from "@/components/ui/Toast";
import { ProductList } from "@/components/products/ProductList";

interface ProdutoTabProps {
  canManageStock: boolean;
  isAdmin?: boolean;
}

export function ProdutoTab({ canManageStock, isAdmin = false }: ProdutoTabProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formMinLimit, setFormMinLimit] = useState<number | "">("");
  const [formDesiredLimit, setFormDesiredLimit] = useState<number | "">("");
  const [formObs, setFormObs] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [formBrands, setFormBrands] = useState<string[]>([]);
  const [brandInput, setBrandInput] = useState("");
  const [formAdditionalUnit, setFormAdditionalUnit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; subMessage?: string; type?: "success" | "error" | "warning" } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { catalog, loading: loadingCatalog, error: catalogError } = useStockCatalog();
  useActionCursor(submitting);

  const resetForm = () => {
    setFormName("");
    setFormCategory("");
    setFormUnit("");
    setFormMinLimit("");
    setFormDesiredLimit("");
    setFormBrands([]);
    setBrandInput("");
    setFormAdditionalUnit("");
    setFormObs("");
    setShowOptional(false);
  };

  const addBrand = () => {
    const trimmed = brandInput.trim();
    if (trimmed && !formBrands.includes(trimmed)) {
      setFormBrands([...formBrands, trimmed]);
      setBrandInput("");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (formMinLimit === "" || formDesiredLimit === "" || Number(formDesiredLimit) < Number(formMinLimit)) {
      setToast({ message: "Verifique os limites do produto.", subMessage: "O limite desejável deve ser maior ou igual ao limite mínimo.", type: "warning" });
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName,
        category: formCategory,
        unit: formUnit,
        minimumLimit: formMinLimit,
        desiredLimit: formDesiredLimit,
        brand: formBrands.length > 0 ? formBrands.join(", ") : null,
        additionalUnit: formAdditionalUnit || null,
        observations: formObs || null,
      }),
    });
    const data = await res.json().catch(() => null);
    setSubmitting(false);

    if (!res.ok) {
      setToast({ message: "Não foi possível cadastrar o produto.", subMessage: data?.error ?? "Verifique os dados informados.", type: "error" });
      return;
    }

    setToast({ message: "Produto cadastrado com sucesso!", subMessage: `Código: ${data.code}` });
    resetForm();
    setModalOpen(false);
    setRefreshKey((key) => key + 1);
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast.message} subMessage={toast.subMessage} type={toast.type ?? "success"} onClose={() => setToast(null)} /> : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-left">
          <h2 className="text-2xl font-bold text-white">Produtos</h2>
          <p className="text-slate-400 text-sm mt-1">
            {canManageStock ? "Consulte, filtre e cadastre produtos de consumo." : "Consulte os produtos cadastrados no estoque."}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          <RefreshButton onClick={() => setRefreshKey((key) => key + 1)} />
          {canManageStock ? (
            <button type="button" onClick={() => setModalOpen(true)} className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 p-0 text-white shadow-[0_14px_30px_rgba(37,99,235,0.38)] transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50 lg:static lg:h-auto lg:gap-2 lg:w-auto lg:rounded-lg lg:px-4 lg:py-2.5 lg:text-sm lg:font-semibold lg:shadow-none lg:translate-x-0 lg:active:scale-100">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="sr-only lg:not-sr-only">Novo produto</span>
            </button>
          ) : null}
        </div>
      </div>

      <ProductList refreshKey={refreshKey} canManageStock={canManageStock} isAdmin={isAdmin} />

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div className="max-h-[86dvh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-4 pb-8 sm:max-h-[92dvh] sm:p-6" onClick={(event) => event.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">Novo produto</h3>
                <p className="text-sm text-slate-400">Preencha os dados do produto de consumo.</p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-lg p-2 text-2xl leading-none text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              {catalogError ? <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{catalogError}</p> : null}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Nome *"><input required value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="Nome do produto" /></Field>
                <Field label="Categoria *"><select required value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"><option value="">Selecione...</option>{catalog.categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></Field>
                <Field label="Unidade de Medida *"><select required value={formUnit} onChange={(e) => setFormUnit(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"><option value="">Selecione...</option>{catalog.units.map((unit) => <option key={unit.id} value={unit.name}>{unit.name}</option>)}</select></Field>
                <Field label="Limite Mínimo *"><input type="number" required min={0} value={formMinLimit} onChange={(e) => setFormMinLimit(e.target.value ? parseInt(e.target.value, 10) : "")} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="Quantidade mínima" /></Field>
                <Field label="Limite Desejável *"><input type="number" required min={formMinLimit === "" ? 0 : formMinLimit} value={formDesiredLimit} onChange={(e) => setFormDesiredLimit(e.target.value ? parseInt(e.target.value, 10) : "")} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="Quantidade desejável" /></Field>
              </div>
              <Field label="Observações"><textarea value={formObs} onChange={(e) => setFormObs(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Informações adicionais..." /></Field>
              <button type="button" onClick={() => setShowOptional(!showOptional)} className="text-sm text-slate-400 transition-colors hover:text-white">{showOptional ? "Ocultar" : "Mostrar"} campos adicionais</button>
              {showOptional ? (
                <div className="grid grid-cols-1 gap-4 border-t border-slate-800 pt-4 md:grid-cols-2">
                  <Field label="Marcas"><div className="flex gap-2"><input value={brandInput} onChange={(e) => setBrandInput(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500" placeholder="Digite uma marca" /><button type="button" onClick={addBrand} className="rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-white">Adicionar</button></div><div className="mt-2 flex flex-wrap gap-2">{formBrands.map((brand) => <button key={brand} type="button" onClick={() => setFormBrands(formBrands.filter((item) => item !== brand))} className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-300">{brand} ×</button>)}</div></Field>
                  <Field label="Unidade adicional"><select value={formAdditionalUnit} onChange={(e) => setFormAdditionalUnit(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-500"><option value="">Nenhuma</option>{catalog.units.map((unit) => <option key={unit.id} value={unit.name}>{unit.name}</option>)}</select></Field>
                </div>
              ) : null}
              <div className="flex justify-center border-t border-slate-800 pt-4">
                <button type="submit" disabled={submitting || loadingCatalog} className="w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50 sm:w-auto">{submitting ? "Cadastrando..." : "Cadastrar produto"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-slate-300"><span className="mb-1 block">{label}</span>{children}</label>;
}




