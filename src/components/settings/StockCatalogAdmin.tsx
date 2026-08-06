"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Toast } from "@/components/ui/Toast";
import type { StockCatalog, StockCategoryOption, StockUnitOption } from "@/lib/stock-catalog";

const emptyCategoryDraft = { name: "", active: true };
const emptyUnitDraft = { name: "", pluralName: "", active: true };

type ToastState = { message: string; type: "success" | "error" } | null;

async function parseApiError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  return payload?.error || fallback;
}

export function StockCatalogAdmin() {
  const [catalog, setCatalog] = useState<StockCatalog>({ categories: [], units: [] });
  const [categoryDraft, setCategoryDraft] = useState(emptyCategoryDraft);
  const [unitDraft, setUnitDraft] = useState(emptyUnitDraft);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/stock-catalog");
      if (!response.ok) throw new Error(await parseApiError(response, "Nao foi possivel carregar o catalogo."));
      setCatalog(await response.json());
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : "Nao foi possivel carregar o catalogo.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadCatalog);
  }, [loadCatalog]);

  function editCategory(category: StockCategoryOption) {
    setEditingCategoryId(category.id);
    setCategoryDraft({ name: category.name, active: category.active });
  }

  function editUnit(unit: StockUnitOption) {
    setEditingUnitId(unit.id);
    setUnitDraft({ name: unit.name, pluralName: unit.pluralName, active: unit.active });
  }

  function resetCategoryDraft() {
    setEditingCategoryId(null);
    setCategoryDraft(emptyCategoryDraft);
  }

  function resetUnitDraft() {
    setEditingUnitId(null);
    setUnitDraft(emptyUnitDraft);
  }

  async function saveCategory() {
    if (!categoryDraft.name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/stock-catalog/categories", {
        method: editingCategoryId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingCategoryId, ...categoryDraft }),
      });
      if (!response.ok) throw new Error(await parseApiError(response, "Nao foi possivel salvar a categoria."));
      setToast({ message: editingCategoryId ? "Categoria atualizada." : "Categoria criada.", type: "success" });
      resetCategoryDraft();
      await loadCatalog();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Nao foi possivel salvar a categoria.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function saveUnit() {
    if (!unitDraft.name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/stock-catalog/units", {
        method: editingUnitId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingUnitId, ...unitDraft }),
      });
      if (!response.ok) throw new Error(await parseApiError(response, "Nao foi possivel salvar a unidade."));
      setToast({ message: editingUnitId ? "Unidade atualizada." : "Unidade criada.", type: "success" });
      resetUnitDraft();
      await loadCatalog();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Nao foi possivel salvar a unidade.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(category: StockCategoryOption) {
    if (!window.confirm(`Excluir a categoria ${category.name}?`)) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/stock-catalog/categories?id=${category.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await parseApiError(response, "Nao foi possivel excluir a categoria."));
      setToast({ message: "Categoria excluida.", type: "success" });
      await loadCatalog();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Nao foi possivel excluir a categoria.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteUnit(unit: StockUnitOption) {
    if (!window.confirm(`Excluir a unidade ${unit.name}?`)) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/stock-catalog/units?id=${unit.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await parseApiError(response, "Nao foi possivel excluir a unidade."));
      setToast({ message: "Unidade excluida.", type: "success" });
      await loadCatalog();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Nao foi possivel excluir a unidade.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}

      <div className="text-center lg:text-left">
        <h2 className="text-2xl font-bold text-white">Configurações</h2>
        <p className="mt-1 text-sm text-slate-400">Gerencie categorias e unidades usadas nos produtos.</p>
      </div>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Categorias</h3>
            {editingCategoryId ? (
              <button className="text-sm text-slate-400 hover:text-white" type="button" onClick={resetCategoryDraft}>
                Cancelar edição
              </button>
            ) : null}
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome da categoria"
              value={categoryDraft.name}
              onChange={(event) => setCategoryDraft({ ...categoryDraft, name: event.target.value })}
            />
            <button className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50" type="button" disabled={saving || !categoryDraft.name.trim()} onClick={saveCategory}>
              {editingCategoryId ? "Salvar" : "Adicionar"}
            </button>
          </div>
          <label className="mb-4 flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={categoryDraft.active} onChange={(event) => setCategoryDraft({ ...categoryDraft, active: event.target.checked })} />
            Categoria ativa
          </label>

          <CatalogList loading={loading} emptyText="Nenhuma categoria cadastrada.">
            {catalog.categories.map((category) => (
              <CatalogRow
                key={category.id}
                title={category.name}
                active={category.active}
                onEdit={() => editCategory(category)}
                onDelete={() => void deleteCategory(category)}
                disabled={saving}
              />
            ))}
          </CatalogList>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-white">Unidades</h3>
            {editingUnitId ? (
              <button className="text-sm text-slate-400 hover:text-white" type="button" onClick={resetUnitDraft}>
                Cancelar edição
              </button>
            ) : null}
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Singular"
              value={unitDraft.name}
              onChange={(event) => setUnitDraft({ ...unitDraft, name: event.target.value })}
            />
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Plural"
              value={unitDraft.pluralName}
              onChange={(event) => setUnitDraft({ ...unitDraft, pluralName: event.target.value })}
            />
            <button className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50" type="button" disabled={saving || !unitDraft.name.trim()} onClick={saveUnit}>
              {editingUnitId ? "Salvar" : "Adicionar"}
            </button>
          </div>
          <label className="mb-4 flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={unitDraft.active} onChange={(event) => setUnitDraft({ ...unitDraft, active: event.target.checked })} />
            Unidade ativa
          </label>

          <CatalogList loading={loading} emptyText="Nenhuma unidade cadastrada.">
            {catalog.units.map((unit) => (
              <CatalogRow
                key={unit.id}
                title={unit.name}
                subtitle={`Plural: ${unit.pluralName}`}
                active={unit.active}
                onEdit={() => editUnit(unit)}
                onDelete={() => void deleteUnit(unit)}
                disabled={saving}
              />
            ))}
          </CatalogList>
        </div>
      </section>
    </div>
  );
}

function CatalogList({
  loading,
  emptyText,
  children,
}: {
  loading: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  if (loading) {
    return <p className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">Carregando...</p>;
  }

  if (!children || (Array.isArray(children) && children.length === 0)) {
    return <p className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">{emptyText}</p>;
  }

  return <div className="divide-y divide-slate-800 rounded-lg border border-slate-800">{children}</div>;
}

function CatalogRow({
  title,
  subtitle,
  active,
  onEdit,
  onDelete,
  disabled,
}: {
  title: string;
  subtitle?: string;
  active: boolean;
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 bg-slate-950/40 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-white">{title}</p>
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <span className={`rounded-full border px-2 py-1 text-xs ${active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-800 text-slate-400"}`}>
          {active ? "Ativo" : "Inativo"}
        </span>
        <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-slate-600 hover:text-white" type="button" onClick={onEdit} disabled={disabled}>
          Editar
        </button>
        <button className="rounded-lg border border-rose-500/30 px-3 py-1.5 text-sm text-rose-300 transition-colors hover:border-rose-400 hover:text-rose-200" type="button" onClick={onDelete} disabled={disabled}>
          Excluir
        </button>
      </div>
    </div>
  );
}