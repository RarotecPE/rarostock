"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Equipment, EquipmentUser, holderLabel, normalizeSearch } from "@/types/stock";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { Toast } from "@/components/ui/Toast";
import { FilterCheckbox, FilterDropdown, FilterSection, toggleFilterValue } from "@/components/ui/FilterDropdown";
import { useStockSession } from "@/components/layout/StockAppShell";

type ToastState = { message: string; type?: "success" | "error" | "warning"; subMessage?: string } | null;
type EquipmentDraft = { code: string; name: string; brand: string; category: string; price: string; observations: string; active: boolean };
type SortField = "code" | "name" | "category" | "brand" | "holder" | "price";
type SortDir = "asc" | "desc";

export function EquipmentTab() {
  const { canMutateStock, user, isAdmin } = useStockSession();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<EquipmentUser[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [holderFilters, setHolderFilters] = useState<string[]>([]);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [selected, setSelected] = useState<Equipment | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [sortField, setSortField] = useState<SortField>("code");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const load = useCallback(async () => {
    setLoading(true);
    const [equipmentRes, usersRes, categoriesRes] = await Promise.all([
      fetch("/api/equipments"),
      fetch("/api/equipment-users"),
      fetch("/api/equipment-categories"),
    ]);
    const [equipmentData, usersData, categoryData] = await Promise.all([
      equipmentRes.json().catch(() => []),
      usersRes.json().catch(() => ({ users: [] })),
      categoriesRes.json().catch(() => []),
    ]);
    if (!equipmentRes.ok) {
      setToast({ message: "Não foi possível carregar os equipamentos.", type: "error" });
    }
    setEquipments(Array.isArray(equipmentData) ? equipmentData : []);
    setUsers(Array.isArray(usersData?.users) ? usersData.users : []);
    setCategories(Array.isArray(categoryData) ? categoryData : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => {
    let result = equipments;
    if (search) {
      const norm = normalizeSearch(search);
      result = result.filter((equipment) => normalizeSearch(`${equipment.code} ${equipment.name} ${equipment.brand ?? ""}`).includes(norm));
    }
    if (holderFilters.length) {
      result = result.filter((equipment) => holderFilters.some((holder) => holder === "company" ? equipment.holderType === "company" : equipment.holderUserId === holder));
    }
    if (categoryFilters.length) result = result.filter((equipment) => categoryFilters.includes(equipment.category));

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === "code") cmp = a.code.localeCompare(b.code);
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      if (sortField === "category") cmp = a.category.localeCompare(b.category);
      if (sortField === "brand") cmp = (a.brand ?? "").localeCompare(b.brand ?? "");
      if (sortField === "holder") cmp = holderLabel(a).localeCompare(holderLabel(b));
      if (sortField === "price") cmp = Number(a.price ?? 0) - Number(b.price ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [equipments, search, holderFilters, categoryFilters, sortDir, sortField]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((dir) => dir === "asc" ? "desc" : "asc");
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

  const activeFiltersCount = holderFilters.length + categoryFilters.length;

  const holderOptions = useMemo(() => [
    { value: "company", label: "RAROTEC" },
    ...users.map((item) => ({ value: item.id, label: item.nome })),
  ], [users]);

  const openEdit = (equipment: Equipment) => {
    setSelected(null);
    setEditing(equipment);
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast.message} subMessage={toast.subMessage} type={toast.type ?? "success"} onClose={() => setToast(null)} /> : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-left">
          <h2 className="text-2xl font-bold text-white">Equipamentos</h2>
          <p className="mt-1 text-sm text-slate-400">Controle quem está com cada equipamento da empresa.</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center"><RefreshButton onClick={() => void load()} />{canMutateStock ? <button className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 p-0 text-white shadow-[0_14px_30px_rgba(37,99,235,0.38)] transition-all hover:bg-blue-500 active:scale-95 disabled:opacity-50 lg:static lg:h-auto lg:gap-2 lg:w-auto lg:rounded-lg lg:px-4 lg:py-2.5 lg:text-sm lg:font-semibold lg:shadow-none lg:translate-x-0 lg:active:scale-100" type="button" onClick={() => setModalOpen(true)}><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg><span className="sr-only lg:not-sr-only">Novo equipamento</span></button> : null}</div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar por nome, código ou marca..." />
        <FilterDropdown
          open={showFilters}
          onOpenChange={setShowFilters}
          activeCount={activeFiltersCount}
          onClear={() => { setHolderFilters([]); setCategoryFilters([]); }}
        >
          <FilterSection title="Portadores" activeCount={holderFilters.length}>
            {holderOptions.map((holder) => (
              <FilterCheckbox key={holder.value} label={holder.label} checked={holderFilters.includes(holder.value)} onChange={() => setHolderFilters((prev) => toggleFilterValue(prev, holder.value))} />
            ))}
          </FilterSection>
          <FilterSection title="Categorias" activeCount={categoryFilters.length}>
            {categories.map((category) => (
              <FilterCheckbox key={category.id} label={category.name} checked={categoryFilters.includes(category.name)} onChange={() => setCategoryFilters((prev) => toggleFilterValue(prev, category.name))} />
            ))}
          </FilterSection>
        </FilterDropdown>
      </div>
      {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" /></div> : (
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/90">
          <table className="hidden w-full text-sm lg:table">
            <thead><tr className="border-b border-slate-800">{[["code","Código"],["name","Nome"],["category","Categoria"],["brand","Marca"],["holder","Portador"],["price","Preço"]].map(([field,label]) => <th key={field} className="px-4 py-3 text-left"><button onClick={() => handleSort(field as SortField)} className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-300">{label}{renderSortIcon(field as SortField)}</button></th>)}</tr></thead>
            <tbody>{filtered.map((equipment) => <tr key={equipment.id} onClick={() => setSelected(equipment)} className="cursor-pointer border-b border-slate-800/50 transition-colors hover:bg-slate-800/50"><td className="px-4 py-3 font-mono text-xs text-blue-400">{equipment.code}</td><td className="px-4 py-3 text-white">{equipment.name}</td><td className="px-4 py-3 text-slate-300">{equipment.category}</td><td className="px-4 py-3 text-slate-400">{equipment.brand || "—"}</td><td className="px-4 py-3 text-slate-300"><HolderCell equipment={equipment} users={users} /></td><td className="px-4 py-3 text-slate-400">{equipment.price ? `R$ ${Number(equipment.price).toFixed(2)}` : "—"}</td></tr>)}</tbody>
          </table>
          <div className="space-y-3 p-3 lg:hidden">{filtered.map((equipment) => <button key={equipment.id} type="button" onClick={() => setSelected(equipment)} className="w-full rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-left"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-xs text-blue-400">{equipment.code}</p><h3 className="font-semibold text-white">{equipment.name}</h3></div></div><p className="mt-1 text-xs text-slate-400">{equipment.category}</p><div className="mt-3"><HolderCell equipment={equipment} users={users} /></div></button>)}</div>
        </div>
      )}
      {modalOpen ? <EquipmentFormModal categories={categories} onClose={() => setModalOpen(false)} onDone={() => { setModalOpen(false); void load(); setToast({ message: "Equipamento cadastrado." }); }} /> : null}
      {editing ? <EquipmentFormModal equipment={editing} categories={categories} onClose={() => setEditing(null)} onDone={() => { setEditing(null); void load(); setToast({ message: "Equipamento atualizado." }); }} /> : null}
      {selected ? <EquipmentDetailModal equipment={selected} users={users} currentUserId={user?.id ?? ""} isAdmin={isAdmin} canEdit={canMutateStock} onEdit={() => openEdit(selected)} onClose={() => setSelected(null)} onDone={(message) => { setSelected(null); void load(); setToast({ message }); }} /> : null}
    </div>
  );
}

function EquipmentFormModal({ equipment, categories, onClose, onDone }: { equipment?: Equipment; categories: Array<{ id: number; name: string }>; onClose: () => void; onDone: () => void }) {
  const [draft, setDraft] = useState<EquipmentDraft>(() => ({
    code: equipment?.code ?? "",
    name: equipment?.name ?? "",
    brand: equipment?.brand ?? "",
    category: equipment?.category ?? "",
    price: equipment?.price ?? "",
    observations: equipment?.observations ?? "",
    active: equipment?.active ?? true,
  }));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const isEditing = Boolean(equipment);

  const save = async () => {
    setError("");
    if (!draft.code.trim() || !draft.name.trim() || !draft.category.trim()) {
      setError("Código, nome e categoria são obrigatórios.");
      return;
    }
    setSaving(true);
    let invoicePayload = {};

    if (invoiceFile) {
      const formData = new FormData();
      formData.append("file", invoiceFile);
      formData.append("context", "equipment");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json().catch(() => null);

      if (!uploadRes.ok) {
        setSaving(false);
        setError(uploadData?.error ?? "Não foi possível enviar a nota fiscal.");
        return;
      }

      invoicePayload = {
        invoiceUrl: uploadData.url,
        invoiceFilename: uploadData.filename,
        invoiceStoragePath: uploadData.storagePath,
      };
    }

    const res = await fetch("/api/equipments", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEditing ? { ...draft, ...invoicePayload, id: equipment?.id } : { ...draft, ...invoicePayload }),
    });
    const payload = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(payload?.error ?? "Não foi possível salvar.");
      return;
    }
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-900 p-4 pb-12 sm:pb-6 sm:rounded-2xl sm:p-6">
        <div className="mb-5 flex justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">{isEditing ? "Editar equipamento" : "Novo equipamento"}</h3>
            <p className="text-sm text-slate-400">Código patrimonial obrigatório e único.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">×</button>
        </div>
        {error ? <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p> : null}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Nome *" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
          <Input label="Código *" value={draft.code} onChange={(value) => setDraft({ ...draft, code: value })} />
          <Input label="Marca" value={draft.brand} onChange={(value) => setDraft({ ...draft, brand: value })} />
          <label className="text-sm font-medium text-slate-300"><span className="mb-1 block">Categoria *</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white"><option value="">Selecione...</option>{categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></label>
          <Input label="Preço" value={draft.price} type="number" onChange={(value) => setDraft({ ...draft, price: value })} />
          {isEditing ? <label className="flex items-center gap-2 self-end rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5 text-sm font-medium text-slate-300"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} className="h-4 w-4 rounded border-slate-700 bg-slate-800" />Equipamento ativo</label> : null}
        </div>
        <label className="mt-4 block text-sm font-medium text-slate-300"><span className="mb-1 block">Observações</span><textarea value={draft.observations} onChange={(event) => setDraft({ ...draft, observations: event.target.value })} rows={3} className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white" /></label>
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/35 px-3 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-300">Nota fiscal</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {invoiceFile?.name ?? equipment?.invoiceFilename ?? "Sem nota fiscal anexada"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {equipment?.invoiceUrl ? (
                <a
                  href={equipment.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-slate-700 px-2.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300"
                >
                  Abrir
                </a>
              ) : null}
              <label
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition-colors hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300"
                title={equipment?.invoiceUrl ? "Substituir nota fiscal" : "Anexar nota fiscal"}
                aria-label={equipment?.invoiceUrl ? "Substituir nota fiscal" : "Anexar nota fiscal"}
              >
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  onChange={(event) => setInvoiceFile(event.target.files?.[0] ?? null)}
                />
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94a3 3 0 114.243 4.243L8.56 18.31a1.5 1.5 0 11-2.121-2.121l9.192-9.193" />
                </svg>
              </label>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-center border-t border-slate-800 pt-4"><button disabled={saving} className="w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60 sm:w-auto" onClick={save}>{saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Salvar"}</button></div>
      </div>
    </div>
  );
}

export function EquipmentDetailModal({ equipment, users, currentUserId, isAdmin, canEdit, onEdit, onClose, onDone }: { equipment: Equipment; users: EquipmentUser[]; currentUserId: string; isAdmin: boolean; canEdit: boolean; onEdit?: () => void; onClose: () => void; onDone: (message: string) => void }) {
  const [reason, setReason] = useState("");
  const [targetUserId, setTargetUserId] = useState("company");
  const [error, setError] = useState("");
  const isMine = equipment.holderType === "user" && equipment.holderUserId === currentUserId;
  const isAvailable = equipment.holderType === "company";
  const selectedUser = users.find((item) => item.id === targetUserId);
  const actionLabel = isAvailable ? "Obter" : isMine ? (targetUserId === "company" ? "Devolver" : "Transferir") : "Solicitar transferência";
  const actionButtonClass = actionLabel === "Obter"
    ? "bg-emerald-600 hover:bg-emerald-500"
    : actionLabel === "Devolver"
      ? "bg-rose-600 hover:bg-rose-500"
      : "bg-blue-600 hover:bg-blue-500";
  const submit = async () => {
    const url = isAvailable ? `/api/equipments/${equipment.id}/obtain` : isMine ? `/api/equipments/${equipment.id}/return` : "/api/equipment-requests";
    const body = isAvailable ? { reason } : isMine ? { reason, toUserId: targetUserId, toUserName: selectedUser?.nome, toUserEmail: selectedUser?.email } : { equipmentId: equipment.id, reason };
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const payload = await res.json().catch(() => null);
    if (!res.ok) { setError(payload?.error ?? "Não foi possível concluir a ação."); return; }
    onDone(isAvailable ? "Equipamento associado a você." : isMine && targetUserId === "company" ? "Equipamento devolvido para RAROTEC." : "Solicitação enviada.");
  };
  const handleDelete = async () => {
    if (!isAdmin) return;
    const confirmed = window.confirm(`Excluir o equipamento "${equipment.name}"? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    const res = await fetch("/api/equipments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: equipment.id }),
    });
    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      setError(payload?.error ?? "Não foi possível excluir o equipamento.");
      return;
    }

    onDone("Equipamento excluído.");
  };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"><div className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-slate-800 bg-slate-900 p-4 pb-12 sm:pb-6 sm:rounded-2xl sm:p-6"><div className="mb-5 flex justify-between"><div><p className="font-mono text-sm text-blue-400">{equipment.code}</p><div className="flex items-center gap-2"><h3 className="text-xl font-bold text-white">{equipment.name}</h3>{canEdit ? <button type="button" onClick={onEdit} aria-label="Editar equipamento" title="Editar equipamento" className="rounded-lg border border-slate-700 p-2 text-slate-400 transition-colors hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 7.125L16.875 4.5" /></svg></button> : null}{isAdmin ? <button type="button" onClick={handleDelete} aria-label="Excluir equipamento" title="Excluir equipamento" className="rounded-lg border border-slate-700 p-2 text-slate-400 transition-colors hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300"><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673A2.25 2.25 0 0115.916 21.75H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button> : null}</div></div><button onClick={onClose} className="text-slate-400 hover:text-white">×</button></div>{error ? <p className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p> : null}<div className="grid grid-cols-1 gap-4 text-sm min-[420px]:grid-cols-2"><Info label="Categoria">{equipment.category}</Info><Info label="Marca">{equipment.brand || "—"}</Info><Info label="Portador atual">{holderLabel(equipment)}</Info><Info label="Preço">{equipment.price ? `R$ ${Number(equipment.price).toFixed(2)}` : "—"}</Info></div><EquipmentInvoiceLink equipment={equipment} />{equipment.observations ? <div className="mt-4"><Info label="Observações">{equipment.observations}</Info></div> : null}{!isMine ? <label className="mt-5 block text-sm font-medium text-slate-300"><span className="mb-1 block">Motivo</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white" /></label> : <label className="mt-5 block text-sm font-medium text-slate-300"><span className="mb-1 block">Destino</span><select value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white"><option value="company">RAROTEC</option>{users.filter((item) => item.id !== currentUserId).map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select><TransferTargetPreview targetUserId={targetUserId} user={selectedUser ?? null} /></label>}<div className="mt-6 flex justify-center"><button className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors ${actionButtonClass}`} onClick={submit}>{actionLabel}</button></div>{isAdmin ? null : null}</div></div>;
}

function EquipmentInvoiceLink({ equipment }: { equipment: Equipment }) {
  return (
    <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/35 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-slate-500">Nota fiscal</p>
          <p className="mt-1 truncate text-sm text-slate-300">
            {equipment.invoiceFilename ?? "Sem nota fiscal anexada"}
          </p>
        </div>
        {equipment.invoiceUrl ? (
          <a
            href={equipment.invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition-colors hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300"
            title="Abrir nota fiscal"
            aria-label="Abrir nota fiscal"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5A3.375 3.375 0 0010.125 2.25H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </a>
        ) : null}
      </div>
    </div>
  );
}

function TransferTargetPreview({ targetUserId, user }: { targetUserId: string; user: EquipmentUser | null }) {
  const isCompany = targetUserId === "company";
  const name = isCompany ? "RAROTEC" : user?.nome ?? "Usuário selecionado";
  const description = isCompany ? "Destino interno da empresa" : user?.email ?? "";
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
  const backgroundImage = isCompany ? "url('/raronexus-logo.png')" : user?.avatar_url ? `url(${user.avatar_url})` : undefined;

  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2.5">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-white bg-contain bg-center bg-no-repeat text-xs font-bold text-slate-700"
        style={backgroundImage ? { backgroundImage } : undefined}
        aria-hidden="true"
      >
        {backgroundImage ? null : initials}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-white">{name}</span>
        {description ? <span className="block truncate text-xs text-slate-500">{description}</span> : null}
      </span>
    </div>
  );
}
function getHolderUser(equipment: Equipment, users: EquipmentUser[]) {
  if (equipment.holderType !== "user" || !equipment.holderUserId) return null;
  return users.find((item) => item.id === equipment.holderUserId) ?? null;
}

function HolderAvatar({ user, label }: { user: EquipmentUser | null; label: string }) {
  const isCompany = label === "RAROTEC";
  const initials = label.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "R";
  const backgroundImage = isCompany ? "url('/raronexus-logo.png')" : user?.avatar_url ? `url(${user.avatar_url})` : undefined;
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-cover bg-center bg-no-repeat text-[10px] font-bold ${isCompany ? "bg-white text-slate-700" : "bg-slate-800 text-slate-200"}`}
      style={backgroundImage ? { backgroundImage } : undefined}
      aria-hidden="true"
    >
      {backgroundImage ? null : initials}
    </span>
  );
}

function HolderCell({ equipment, users }: { equipment: Equipment; users: EquipmentUser[] }) {
  const label = holderLabel(equipment);
  const user = getHolderUser(equipment, users);
  return <div className="flex items-center gap-2"><HolderAvatar user={user} label={label} /><span className="min-w-0 truncate">{label}</span></div>;
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <label className="text-sm font-medium text-slate-300"><span className="mb-1 block">{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white" /></label>; }
function Info({ label, children }: { label: string; children: React.ReactNode }) { return <div><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><div className="mt-1 text-slate-300">{children}</div></div>; }
