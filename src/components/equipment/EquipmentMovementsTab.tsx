"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Equipment, EquipmentMovement, EquipmentUser, normalizeSearch } from "@/types/stock";
import { useStockSession } from "@/components/layout/StockAppShell";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { Toast } from "@/components/ui/Toast";
import { FilterCheckbox, FilterDropdown, FilterSection, toggleFilterValue } from "@/components/ui/FilterDropdown";
import { PaginationControls, getTotalPages, paginate } from "@/components/ui/PaginationControls";

type SortField = "createdAt" | "equipmentName" | "from" | "to" | "reason";
type SortDir = "asc" | "desc";
type ToastState = { message: string; type?: "success" | "error" } | null;

function holderName(type: string, name: string | null) {
  return type === "company" ? "RAROTEC" : name || "Usuário";
}

function MovementHolder({ type, name, userId, users }: { type: string; name: string | null; userId: string | null; users: EquipmentUser[] }) {
  const isCompany = type === "company";
  const user = userId ? users.find((item) => item.id === userId) ?? null : null;
  const displayName = isCompany ? "RAROTEC" : user?.nome ?? name ?? "Usuário";
  const initials = displayName.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
  const backgroundImage = isCompany ? "url('/raronexus-logo.png')" : user?.avatar_url ? `url(${user.avatar_url})` : undefined;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-cover bg-center bg-no-repeat text-[10px] font-bold ${isCompany ? "bg-white text-slate-700" : "bg-slate-800 text-slate-200"}`}
        style={backgroundImage ? { backgroundImage } : undefined}
        aria-hidden="true"
      >
        {backgroundImage ? null : initials}
      </span>
      <span className="min-w-0 truncate">{displayName}</span>
    </div>
  );
}

function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function EquipmentMovementsTab() {
  const { isAdmin } = useStockSession();
  const [movements, setMovements] = useState<EquipmentMovement[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<EquipmentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [equipmentIds, setEquipmentIds] = useState<string[]>([]);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [toast, setToast] = useState<ToastState>(null);
  const [page, setPage] = useState(1);

  const activeFiltersCount = (startDate ? 1 : 0) + (endDate ? 1 : 0) + equipmentIds.length + (isAdmin ? userIds.length : 0);

  const clearFilters = () => {
    setStartDate("");
    setEndDate("");
    setEquipmentIds([]);
    setUserIds([]);
    setPage(1);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    equipmentIds.forEach((id) => params.append("equipmentId", id));
    if (isAdmin) userIds.forEach((id) => params.append("userId", id));

    const [movementsRes, equipmentsRes, usersRes] = await Promise.all([
      fetch(`/api/equipment-movements${params.toString() ? `?${params}` : ""}`),
      fetch("/api/equipments"),
      fetch("/api/equipment-users"),
    ]);

    const [movementData, equipmentData, usersData] = await Promise.all([
      movementsRes.json().catch(() => []),
      equipmentsRes.json().catch(() => []),
      usersRes.json().catch(() => ({ users: [] })),
    ]);

    if (!movementsRes.ok) {
      setToast({ message: "Não foi possível carregar as movimentações.", type: "error" });
    }

    setMovements(Array.isArray(movementData) ? movementData : []);
    setEquipments(Array.isArray(equipmentData) ? equipmentData : []);
    setUsers(Array.isArray(usersData?.users) ? usersData.users : []);
    setLoading(false);
  }, [endDate, equipmentIds, isAdmin, startDate, userIds]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const filtered = useMemo(() => {
    const norm = normalizeSearch(search);
    const result = search
      ? movements.filter((movement) => normalizeSearch(`${movement.equipmentName} ${movement.equipmentCode} ${movement.equipmentCategory} ${movement.fromUserName ?? "RAROTEC"} ${movement.toUserName ?? "RAROTEC"} ${movement.reason ?? ""}`).includes(norm))
      : movements;

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortField === "equipmentName") cmp = `${a.equipmentName} ${a.equipmentCode}`.localeCompare(`${b.equipmentName} ${b.equipmentCode}`);
      if (sortField === "from") cmp = holderName(a.fromHolderType, a.fromUserName).localeCompare(holderName(b.fromHolderType, b.fromUserName));
      if (sortField === "to") cmp = holderName(a.toHolderType, a.toUserName).localeCompare(holderName(b.toHolderType, b.toUserName));
      if (sortField === "reason") cmp = (a.reason ?? "").localeCompare(b.reason ?? "");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [movements, search, sortDir, sortField]);

  const currentPage = Math.min(page, getTotalPages(filtered.length));
  const paginated = useMemo(() => paginate(filtered, currentPage), [filtered, currentPage]);

  const handleSort = (field: SortField) => {
    setPage(1);
    if (sortField === field) setSortDir((dir) => dir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir(field === "createdAt" ? "desc" : "asc"); }
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

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast.message} type={toast.type ?? "success"} onClose={() => setToast(null)} /> : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-left">
          <h2 className="text-2xl font-bold text-white">Movimentações</h2>
          <p className="mt-1 text-sm text-slate-400">Histórico de transferências, obtenções e devoluções de equipamentos.</p>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <RefreshButton onClick={() => void load()} />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Buscar por equipamento, código, usuário ou motivo..." />
        <FilterDropdown open={showFilters} onOpenChange={setShowFilters} activeCount={activeFiltersCount} onClear={clearFilters}>
          <FilterSection title="Período" activeCount={(startDate ? 1 : 0) + (endDate ? 1 : 0)}>
            <div className="grid grid-cols-1 gap-2">
              <label className="space-y-1 text-sm text-slate-300"><span className="block text-xs text-slate-500">Data inicial</span><input type="date" value={startDate} onChange={(event) => { setStartDate(event.target.value); setPage(1); }} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500" /></label>
              <label className="space-y-1 text-sm text-slate-300"><span className="block text-xs text-slate-500">Data final</span><input type="date" value={endDate} onChange={(event) => { setEndDate(event.target.value); setPage(1); }} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500" /></label>
            </div>
          </FilterSection>
          <FilterSection title="Equipamentos" activeCount={equipmentIds.length}>
            {equipments.map((equipment) => <FilterCheckbox key={equipment.id} label={`${equipment.name} (${equipment.code})`} checked={equipmentIds.includes(String(equipment.id))} onChange={() => { setEquipmentIds((prev) => toggleFilterValue(prev, String(equipment.id))); setPage(1); }} />)}
          </FilterSection>
          {isAdmin ? (
            <FilterSection title="Usuários" activeCount={userIds.length}>
              {users.map((user) => <FilterCheckbox key={user.id} label={user.nome} checked={userIds.includes(user.id)} onChange={() => { setUserIds((prev) => toggleFilterValue(prev, user.id)); setPage(1); }} />)}
            </FilterSection>
          ) : null}
        </FilterDropdown>
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" /></div> : filtered.length === 0 ? <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-8 text-center text-sm text-slate-500">Nenhuma movimentação encontrada.</div> : (
        <>
          <p className="text-sm text-slate-400">{filtered.length} {filtered.length === 1 ? "movimentação encontrada" : "movimentações encontradas"}</p>
          <div className="hidden overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/90 lg:block">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-800">{[["createdAt", "Data"], ["equipmentName", "Equipamento"], ["from", "Origem"], ["to", "Destino"], ["reason", "Motivo"]].map(([field, label]) => <th key={field} className="px-4 py-3 text-left"><button onClick={() => handleSort(field as SortField)} className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-slate-500 transition-colors hover:text-slate-300">{label}{renderSortIcon(field as SortField)}</button></th>)}</tr></thead>
              <tbody>{paginated.map((movement) => <tr key={movement.id} className="border-b border-slate-800/50 transition-colors hover:bg-slate-800/50"><td className="px-4 py-3 text-slate-300">{formatDateTime(movement.createdAt)}</td><td className="px-4 py-3"><p className="font-medium text-white">{movement.equipmentName}</p><p className="font-mono text-xs text-blue-400">{movement.equipmentCode}</p></td><td className="px-4 py-3 text-slate-300"><MovementHolder type={movement.fromHolderType} name={movement.fromUserName} userId={movement.fromUserId} users={users} /></td><td className="px-4 py-3 text-slate-300"><MovementHolder type={movement.toHolderType} name={movement.toUserName} userId={movement.toUserId} users={users} /></td><td className="px-4 py-3 text-slate-400">{movement.reason || "—"}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="space-y-3 lg:hidden">{paginated.map((movement) => <div key={movement.id} className="rounded-xl border border-slate-800 bg-slate-900/90 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-white">{movement.equipmentName}</p><p className="font-mono text-xs text-blue-400">{movement.equipmentCode}</p></div><span className="text-xs text-slate-500">{formatDateTime(movement.createdAt)}</span></div><div className="mt-3 flex flex-col gap-2 text-sm text-slate-300"><MovementHolder type={movement.fromHolderType} name={movement.fromUserName} userId={movement.fromUserId} users={users} /><span className="text-xs text-slate-500">para</span><MovementHolder type={movement.toHolderType} name={movement.toUserName} userId={movement.toUserId} users={users} /></div>{movement.reason ? <p className="mt-1 text-xs text-slate-500">{movement.reason}</p> : null}</div>)}</div>
          <PaginationControls page={currentPage} totalItems={filtered.length} onPageChange={setPage} itemLabel="movimentações" />
        </>
      )}
    </div>
  );
}
