"use client";

import { Children, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { Toast } from "@/components/ui/Toast";
import { PaginationControls, getTotalPages, paginate } from "@/components/ui/PaginationControls";
import type { StockCatalog, StockCategoryOption, StockUnitOption } from "@/lib/stock-catalog";

const emptyCategoryDraft = { name: "", active: true };
const emptyUnitDraft = { name: "", pluralName: "", active: true };
const emptyEquipmentCategoryDraft = { name: "", active: true };

type ToastState = { message: string; type: "success" | "error" } | null;
type EquipmentCategoryOption = { id: number; name: string; active: boolean; createdAt?: string; updatedAt?: string };
type AdminCatalog = StockCatalog & { equipmentCategories: EquipmentCategoryOption[] };

async function parseApiError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null);
  return payload?.error || fallback;
}

export function StockCatalogAdmin() {
  const [catalog, setCatalog] = useState<AdminCatalog>({ categories: [], units: [], equipmentCategories: [] });
  const [categoryDraft, setCategoryDraft] = useState(emptyCategoryDraft);
  const [unitDraft, setUnitDraft] = useState(emptyUnitDraft);
  const [equipmentCategoryDraft, setEquipmentCategoryDraft] = useState(emptyEquipmentCategoryDraft);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);
  const [editingEquipmentCategoryId, setEditingEquipmentCategoryId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/stock-catalog");
      if (!response.ok) throw new Error(await parseApiError(response, "Não foi possível carregar o catálogo."));
      const payload = await response.json();
      setCatalog({ categories: payload.categories ?? [], units: payload.units ?? [], equipmentCategories: payload.equipmentCategories ?? [] });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "Não foi possível carregar o catálogo.", type: "error" });
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

  function editEquipmentCategory(category: EquipmentCategoryOption) {
    setEditingEquipmentCategoryId(category.id);
    setEquipmentCategoryDraft({ name: category.name, active: category.active });
  }

  function resetCategoryDraft() {
    setEditingCategoryId(null);
    setCategoryDraft(emptyCategoryDraft);
  }

  function resetUnitDraft() {
    setEditingUnitId(null);
    setUnitDraft(emptyUnitDraft);
  }

  function resetEquipmentCategoryDraft() {
    setEditingEquipmentCategoryId(null);
    setEquipmentCategoryDraft(emptyEquipmentCategoryDraft);
  }

  async function saveCatalogItem(endpoint: string, editingId: number | null, draft: { name: string; active: boolean; pluralName?: string }, successCreate: string, successUpdate: string, fallback: string, reset: () => void) {
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(endpoint, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...draft }),
      });
      if (!response.ok) throw new Error(await parseApiError(response, fallback));
      setToast({ message: editingId ? successUpdate : successCreate, type: "success" });
      reset();
      await loadCatalog();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : fallback, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCatalogItem(endpoint: string, id: number, name: string, label: string, fallback: string) {
    if (!window.confirm(`Excluir ${label} ${name}?`)) return;
    setSaving(true);
    try {
      const response = await fetch(`${endpoint}?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await parseApiError(response, fallback));
      setToast({ message: `${label[0].toUpperCase()}${label.slice(1)} excluída.`, type: "success" });
      await loadCatalog();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : fallback, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /> : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-left">
          <h2 className="text-2xl font-bold text-white">Configurações</h2>
          <p className="mt-1 text-sm text-slate-400">Gerencie categorias e unidades usadas nos produtos e equipamentos.</p>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <RefreshButton onClick={() => void loadCatalog()} />
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-3">
        <CatalogPanel
          title="Categorias de Produtos"
          draft={categoryDraft}
          editing={Boolean(editingCategoryId)}
          saving={saving}
          loading={loading}
          emptyText="Nenhuma categoria cadastrada."
          onDraftChange={setCategoryDraft}
          onCancel={resetCategoryDraft}
          onSave={() => void saveCatalogItem("/api/admin/stock-catalog/categories", editingCategoryId, categoryDraft, "Categoria criada.", "Categoria atualizada.", "Não foi possível salvar a categoria.", resetCategoryDraft)}
        >
          {catalog.categories.map((category) => (
            <CatalogRow key={category.id} title={category.name} active={category.active} onEdit={() => editCategory(category)} onDelete={() => void deleteCatalogItem("/api/admin/stock-catalog/categories", category.id, category.name, "categoria", "Não foi possível excluir a categoria.")} disabled={saving} />
          ))}
        </CatalogPanel>

        <UnitPanel
          draft={unitDraft}
          editing={Boolean(editingUnitId)}
          saving={saving}
          loading={loading}
          units={catalog.units}
          onDraftChange={setUnitDraft}
          onCancel={resetUnitDraft}
          onSave={() => void saveCatalogItem("/api/admin/stock-catalog/units", editingUnitId, unitDraft, "Unidade criada.", "Unidade atualizada.", "Não foi possível salvar a unidade.", resetUnitDraft)}
          onEdit={editUnit}
          onDelete={(unit) => void deleteCatalogItem("/api/admin/stock-catalog/units", unit.id, unit.name, "unidade", "Não foi possível excluir a unidade.")}
        />

        <CatalogPanel
          title="Categorias de Equipamentos"
          draft={equipmentCategoryDraft}
          editing={Boolean(editingEquipmentCategoryId)}
          saving={saving}
          loading={loading}
          emptyText="Nenhuma categoria de equipamento cadastrada."
          onDraftChange={setEquipmentCategoryDraft}
          onCancel={resetEquipmentCategoryDraft}
          onSave={() => void saveCatalogItem("/api/admin/stock-catalog/equipment-categories", editingEquipmentCategoryId, equipmentCategoryDraft, "Categoria de equipamento criada.", "Categoria de equipamento atualizada.", "Não foi possível salvar a categoria de equipamento.", resetEquipmentCategoryDraft)}
        >
          {catalog.equipmentCategories.map((category) => (
            <CatalogRow key={category.id} title={category.name} active={category.active} onEdit={() => editEquipmentCategory(category)} onDelete={() => void deleteCatalogItem("/api/admin/stock-catalog/equipment-categories", category.id, category.name, "categoria", "Não foi possível excluir a categoria de equipamento.")} disabled={saving} />
          ))}
        </CatalogPanel>
      </section>
    </div>
  );
}

function CatalogPanel({ title, draft, editing, saving, loading, emptyText, onDraftChange, onCancel, onSave, children }: { title: string; draft: { name: string; active: boolean }; editing: boolean; saving: boolean; loading: boolean; emptyText: string; onDraftChange: (draft: { name: string; active: boolean }) => void; onCancel: () => void; onSave: () => void; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {editing ? <button className="text-sm text-slate-400 hover:text-white" type="button" onClick={onCancel}>Cancelar edição</button> : null}
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome da categoria" value={draft.name} onChange={(event) => onDraftChange({ ...draft, name: event.target.value })} />
        <button className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50" type="button" disabled={saving || !draft.name.trim()} onClick={onSave}>{editing ? "Salvar" : "Adicionar"}</button>
      </div>
      <label className="mb-4 flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={draft.active} onChange={(event) => onDraftChange({ ...draft, active: event.target.checked })} />
        Categoria ativa
      </label>
      <CatalogList loading={loading} emptyText={emptyText}>{children}</CatalogList>
    </div>
  );
}

function UnitPanel({ draft, editing, saving, loading, units, onDraftChange, onCancel, onSave, onEdit, onDelete }: { draft: { name: string; pluralName: string; active: boolean }; editing: boolean; saving: boolean; loading: boolean; units: StockUnitOption[]; onDraftChange: (draft: { name: string; pluralName: string; active: boolean }) => void; onCancel: () => void; onSave: () => void; onEdit: (unit: StockUnitOption) => void; onDelete: (unit: StockUnitOption) => void }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Unidades de Produtos</h3>
        {editing ? <button className="text-sm text-slate-400 hover:text-white" type="button" onClick={onCancel}>Cancelar edição</button> : null}
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Singular" value={draft.name} onChange={(event) => onDraftChange({ ...draft, name: event.target.value })} />
        <input className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Plural" value={draft.pluralName} onChange={(event) => onDraftChange({ ...draft, pluralName: event.target.value })} />
        <button className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50" type="button" disabled={saving || !draft.name.trim()} onClick={onSave}>{editing ? "Salvar" : "Adicionar"}</button>
      </div>
      <label className="mb-4 flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={draft.active} onChange={(event) => onDraftChange({ ...draft, active: event.target.checked })} />
        Unidade ativa
      </label>
      <CatalogList loading={loading} emptyText="Nenhuma unidade cadastrada.">
        {units.map((unit) => <CatalogRow key={unit.id} title={unit.name} subtitle={`Plural: ${unit.pluralName}`} active={unit.active} onEdit={() => onEdit(unit)} onDelete={() => onDelete(unit)} disabled={saving} />)}
      </CatalogList>
    </div>
  );
}

function CatalogList({ loading, emptyText, children }: { loading: boolean; emptyText: string; children: ReactNode }) {
  const [page, setPage] = useState(1);
  const rows = useMemo(() => Children.toArray(children), [children]);
  const currentPage = Math.min(page, getTotalPages(rows.length));
  const paginatedRows = useMemo(() => paginate(rows, currentPage), [currentPage, rows]);

  if (loading) return <p className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">Carregando...</p>;
  if (rows.length === 0) return <p className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">{emptyText}</p>;
  return (
    <div className="space-y-3">
      <div className="divide-y divide-slate-800 rounded-lg border border-slate-800">{paginatedRows}</div>
      <PaginationControls page={currentPage} totalItems={rows.length} onPageChange={setPage} />
    </div>
  );
}

function CatalogRow({ title, subtitle, active, onEdit, onDelete, disabled }: { title: string; subtitle?: string; active: boolean; onEdit: () => void; onDelete: () => void; disabled: boolean }) {
  return (
    <div className="flex flex-col gap-3 bg-slate-950/40 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-white">{title}</p>
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <span className={`rounded-full border px-2 py-1 text-xs ${active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-800 text-slate-400"}`}>{active ? "Ativo" : "Inativo"}</span>
        <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:border-slate-600 hover:text-white" type="button" onClick={onEdit} disabled={disabled}>Editar</button>
        <button className="col-span-2 rounded-lg border border-rose-500/30 px-3 py-1.5 text-sm text-rose-300 transition-colors hover:border-rose-400 hover:text-rose-200 sm:col-span-1" type="button" onClick={onDelete} disabled={disabled}>Excluir</button>
      </div>
    </div>
  );
}
