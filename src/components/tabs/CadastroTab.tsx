"use client";

import { useState } from "react";
import { CATEGORIES, UNITS } from "@/types/stock";
import { Toast } from "@/components/ui/Toast";

export function CadastroTab() {
  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formType, setFormType] = useState<"Equipamento" | "Item de Consumo" | "">(
    ""
  );
  const [formMinLimit, setFormMinLimit] = useState<number | "">("");
  const [formObs, setFormObs] = useState("");
  
  // Optional fields
  const [showOptional, setShowOptional] = useState(false);
  const [formBrands, setFormBrands] = useState<string[]>([]);
  const [brandInput, setBrandInput] = useState("");
  const [formAdditionalUnit, setFormAdditionalUnit] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; subMessage?: string } | null>(null);

  const addBrand = () => {
    const trimmed = brandInput.trim();
    if (trimmed && !formBrands.includes(trimmed)) {
      setFormBrands([...formBrands, trimmed]);
      setBrandInput("");
    }
  };

  const removeBrand = (brand: string) => {
    setFormBrands(formBrands.filter((b) => b !== brand));
  };

  const resetForm = () => {
    setFormName("");
    setFormCategory("");
    setFormUnit("");
    setFormType("");
    setFormMinLimit("");
    setFormBrands([]);
    setBrandInput("");
    setFormAdditionalUnit("");
    setFormObs("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formType) return;
    setSubmitting(true);
    
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName,
        category: formCategory,
        unit: formUnit,
        type: formType,
        minimumLimit:
          formType === "Item de Consumo" ? (formMinLimit || 0) : null,
        brand: formBrands.length > 0 ? formBrands.join(", ") : null,
        additionalUnit: formAdditionalUnit || null,
        observations: formObs || null,
      }),
    });
    
    const data = await res.json();
    setToast({
      message: "Item cadastrado com sucesso!",
      subMessage: `Código: ${data.code}`,
    });
    resetForm();
    setShowOptional(false);
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          subMessage={toast.subMessage}
          type="success"
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="text-center lg:text-left">
        <h2 className="text-2xl font-bold text-white">Cadastro</h2>
        <p className="text-slate-400 text-sm mt-1">
          Cadastre novos itens no estoque
        </p>
      </div>

      {/* Form */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Required Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Nome *
              </label>
              <input
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Nome do item"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Categoria *
              </label>
              <select
                required
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Selecione...</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Unidade de Medida *
              </label>
              <select
                required
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Selecione...</option>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Tipo *
              </label>
              <select
                required
                value={formType}
                onChange={(e) =>
                  setFormType(e.target.value as "Equipamento" | "Item de Consumo" | "")
                }
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Selecione...</option>
                <option value="Item de Consumo">Item de Consumo</option>
                <option value="Equipamento">Equipamento</option>
              </select>
            </div>
            {formType === "Item de Consumo" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Limite Mínimo *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formMinLimit}
                  onChange={(e) => setFormMinLimit(e.target.value ? parseInt(e.target.value) : "")}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="Quantidade mínima"
                />
              </div>
            )}
          </div>

          {/* Observations - larger */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Observações
            </label>
            <textarea
              value={formObs}
              onChange={(e) => setFormObs(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="Informações adicionais sobre o item..."
            />
          </div>

          {/* Optional Fields Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showOptional ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Campos Adicionais
            </button>
          </div>

          {/* Optional Fields */}
          {showOptional && (
            <div className="space-y-4 pt-2 border-t border-slate-800">
              {/* Brands */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Marcas
                </label>
                <div className="flex gap-2">
                  <input
                    value={brandInput}
                    onChange={(e) => setBrandInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addBrand();
                      }
                    }}
                    className="flex-1 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Digite uma marca..."
                  />
                  <button
                    type="button"
                    onClick={addBrand}
                    disabled={!brandInput.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                {formBrands.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formBrands.map((brand) => (
                      <span
                        key={brand}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/15 text-blue-300 border border-blue-500/30 rounded-full text-sm"
                      >
                        {brand}
                        <button
                          type="button"
                          onClick={() => removeBrand(brand)}
                          className="hover:text-blue-100 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Unit */}
              <div className="max-w-sm">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Unidade de Medida Adicional
                </label>
                <select
                  value={formAdditionalUnit}
                  onChange={(e) => setFormAdditionalUnit(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Nenhuma</option>
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center lg:justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={submitting || !formType}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Cadastrar Item
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Help Card */}
      <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 text-center lg:text-left">
        <h3 className="text-sm font-medium text-slate-400 mb-2">💡 Dica</h3>
        <p className="text-xs text-slate-500">
          O código do item (RST-XXXX) é gerado automaticamente. Após cadastrar, você pode visualizar 
          e gerenciar todos os itens no <span className="text-blue-400">Dashboard</span>.
        </p>
      </div>
    </div>
  );
}
