"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Equipment, EquipmentMovement, EquipmentRequest, EquipmentTermPendency, EquipmentUser, holderLabel } from "@/types/stock";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { Toast } from "@/components/ui/Toast";
import { useStockSession } from "@/components/layout/StockAppShell";
import { EquipmentDetailModal } from "@/components/equipment/EquipmentTab";
import { PaginationControls, getTotalPages, paginate } from "@/components/ui/PaginationControls";

type ToastState = { message: string; type?: "success" | "error" } | null;

function formatDateTime(value: string | Date) {
  const date = new Date(value);
  const datePart = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
  return `${datePart} - ${timePart}`;
}
export function PersonalEquipmentTab() {
  const { user, isAdmin, canMutateStock } = useStockSession();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<EquipmentUser[]>([]);
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [movements, setMovements] = useState<EquipmentMovement[]>([]);
  const [termPendencies, setTermPendencies] = useState<EquipmentTermPendency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReceivedHistory, setShowReceivedHistory] = useState(false);
  const [showSentHistory, setShowSentHistory] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [equipmentPage, setEquipmentPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const [equipmentRes, requestsRes, usersRes, movementsRes, pendenciesRes] = await Promise.all([
      fetch("/api/equipments"),
      fetch("/api/equipment-requests?scope=mine&status=all"),
      fetch("/api/equipment-users"),
      fetch("/api/equipment-movements"),
      fetch("/api/equipment-term-pendencies"),
    ]);
    const [equipmentData, requestData, usersData, movementData, pendencyData] = await Promise.all([
      equipmentRes.json().catch(() => []),
      requestsRes.json().catch(() => []),
      usersRes.json().catch(() => ({ users: [] })),
      movementsRes.json().catch(() => []),
      pendenciesRes.json().catch(() => []),
    ]);
    if (!equipmentRes.ok || !requestsRes.ok || !movementsRes.ok || !pendenciesRes.ok) {
      setToast({ message: "Não foi possível carregar os dados pessoais.", type: "error" });
    }
    setEquipments(
      Array.isArray(equipmentData)
        ? equipmentData.filter(
            (item: Equipment) => item.holderType === "user" && item.holderUserId === user?.id,
          )
        : [],
    );
    setRequests(Array.isArray(requestData) ? requestData : []);
    setMovements(Array.isArray(movementData) ? movementData : []);
    setTermPendencies(Array.isArray(pendencyData) ? pendencyData : []);
    setUsers(Array.isArray(usersData?.users) ? usersData.users : []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const receivedRequests = useMemo(
    () => requests.filter((request) => request.requesterUserId !== user?.id),
    [requests, user?.id],
  );
  const sentRequests = useMemo(
    () => requests.filter((request) => request.requesterUserId === user?.id),
    [requests, user?.id],
  );
  const pendingReceivedRequests = useMemo(
    () => receivedRequests.filter((request) => request.status === "pending"),
    [receivedRequests],
  );
  const historicalReceivedRequests = useMemo(
    () => receivedRequests.filter((request) => request.status !== "pending"),
    [receivedRequests],
  );
  const pendingSentRequests = useMemo(
    () => sentRequests.filter((request) => request.status === "pending"),
    [sentRequests],
  );
  const historicalSentRequests = useMemo(
    () => sentRequests.filter((request) => request.status !== "pending"),
    [sentRequests],
  );

  const equipmentSinceById = useMemo(() => {
    const map = new Map<number, string | Date>();
    for (const movement of movements) {
      if (movement.toHolderType !== "user" || movement.toUserId !== user?.id) continue;
      const current = map.get(movement.equipmentId);
      if (!current || new Date(movement.createdAt).getTime() > new Date(current).getTime()) {
        map.set(movement.equipmentId, movement.createdAt);
      }
    }
    return map;
  }, [movements, user?.id]);
  const currentEquipmentPage = Math.min(equipmentPage, getTotalPages(equipments.length));
  const paginatedEquipments = useMemo(() => paginate(equipments, currentEquipmentPage), [currentEquipmentPage, equipments]);

  const decide = async (id: number, approve: boolean, termFile?: File | null, confirmMissingTerm?: boolean) => {
    const formData = new FormData();
    if (termFile) formData.append("termFile", termFile);
    if (confirmMissingTerm) formData.append("confirmMissingTerm", "true");
    const res = await fetch(`/api/equipment-requests/${id}/${approve ? "approve" : "reject"}`, {
      method: "POST",
      body: formData,
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setToast({
        message: payload?.error ?? "Não foi possível atualizar a solicitação.",
        type: "error",
      });
      return;
    }
    setToast({ message: approve ? "Solicitação aprovada." : "Solicitação rejeitada." });
    void load();
  };

  const uploadMovementTerm = async (pendency: EquipmentTermPendency, file: File) => {
    const formData = new FormData();
    formData.append("termType", pendency.termType);
    formData.append("termFile", file);
    const res = await fetch(`/api/equipment-movements/${pendency.movementId}/terms`, { method: "PUT", body: formData });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setToast({ message: payload?.error ?? "Não foi possível anexar o termo.", type: "error" });
      return;
    }
    setToast({ message: "Termo anexado." });
    void load();
  };

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast.message} type={toast.type ?? "success"} onClose={() => setToast(null)} /> : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-left">
          <h2 className="text-2xl font-bold text-white">Pessoal</h2>
          <p className="mt-1 text-sm text-slate-400">Seus equipamentos e solicitações.</p>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <RefreshButton onClick={() => void load()} />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Carregando...</div>
      ) : (
        <>
          <section className="space-y-3">
            <h3 className="font-semibold text-white">Equipamentos com você</h3>
            {equipments.length ? (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {paginatedEquipments.map((equipment) => (
                    <button
                      key={equipment.id}
                      type="button"
                      onClick={() => setSelectedEquipment(equipment)}
                      className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-left transition-colors hover:border-slate-600 hover:bg-slate-800/70"
                    >
                      <p className="font-mono text-xs text-blue-400">{equipment.code}</p>
                      <h4 className="font-semibold text-white">{equipment.name}</h4>
                      <p className="mt-1 text-sm text-slate-400">
                        {equipment.category} · {holderLabel(equipment)}
                      </p>
                      <p className="mt-3 text-xs text-slate-500">{equipmentSinceById.get(equipment.id) ? `Com você desde ${formatDateTime(equipmentSinceById.get(equipment.id)!)}` : "Com você desde data não identificada"}</p><p className="mt-1 text-xs text-slate-500">Clique para devolver ou transferir.</p>
                    </button>
                  ))}
                </div>
                <PaginationControls page={currentEquipmentPage} totalItems={equipments.length} onPageChange={setEquipmentPage} itemLabel="equipamentos" />
              </>
            ) : (
              <p className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-500">
                Nenhum equipamento associado a você.
              </p>
            )}
          </section>

          <TermPendencySection pendencies={termPendencies} currentUserId={user?.id ?? ""} isAdmin={isAdmin} onUpload={uploadMovementTerm} />

          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-semibold text-white">Solicitações Recebidas</h3>
              <button
                type="button"
                onClick={() => setShowReceivedHistory((value) => !value)}
                className="self-start rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-slate-700 hover:text-white sm:self-auto"
              >
                {showReceivedHistory ? "Ocultar histórico" : `Ver histórico (${historicalReceivedRequests.length})`}
              </button>
            </div>
            <RequestList requests={pendingReceivedRequests} users={users} userId={user?.id ?? ""} onDecide={decide} emptyText="Nenhuma solicitação recebida pendente." />
            {showReceivedHistory ? <RequestList requests={historicalReceivedRequests} users={users} userId={user?.id ?? ""} onDecide={decide} emptyText="Nenhuma solicitação recebida concluída." /> : null}
          </section>

          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-semibold text-white">Solicitações Enviadas</h3>
              <button
                type="button"
                onClick={() => setShowSentHistory((value) => !value)}
                className="self-start rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-slate-700 hover:text-white sm:self-auto"
              >
                {showSentHistory ? "Ocultar histórico" : `Ver histórico (${historicalSentRequests.length})`}
              </button>
            </div>
            <RequestList requests={pendingSentRequests} users={users} userId={user?.id ?? ""} onDecide={decide} emptyText="Nenhuma solicitação enviada pendente." />
            {showSentHistory ? <RequestList requests={historicalSentRequests} users={users} userId={user?.id ?? ""} onDecide={decide} emptyText="Nenhuma solicitação enviada concluída." /> : null}
          </section>
        </>
      )}

      {selectedEquipment ? (
        <EquipmentDetailModal
          equipment={selectedEquipment}
          users={users}
          currentUserId={user?.id ?? ""}
          isAdmin={isAdmin}
          canEdit={canMutateStock}
          onClose={() => setSelectedEquipment(null)}
          onDone={(message) => {
            setSelectedEquipment(null);
            setToast({ message });
            void load();
          }}
        />
      ) : null}
    </div>
  );
}

function TermPendencySection({ pendencies, currentUserId, isAdmin, onUpload }: { pendencies: EquipmentTermPendency[]; currentUserId: string; isAdmin: boolean; onUpload: (pendency: EquipmentTermPendency, file: File) => Promise<void> }) {
  if (!pendencies.length) return null;
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-white">Termos Pendentes</h3>
      <div className="space-y-3">
        {pendencies.map((pendency) => {
          const canUpload = pendency.responsibleUserId === currentUserId;
          const title = pendency.termType === "responsibility" ? "Termo de responsabilidade" : "Termo de devolução";
          return (
            <div key={`${pendency.movementId}-${pendency.termType}`} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-amber-300/80">{title}</p>
                  <h4 className="mt-1 font-semibold text-white">{pendency.equipmentName} <span className="font-mono text-xs text-blue-400">{pendency.equipmentCode}</span></h4>
                  <p className="mt-1 text-xs text-slate-500">Responsável: {pendency.responsibleUserName}{isAdmin && pendency.responsibleUserEmail ? ` · ${pendency.responsibleUserEmail}` : ""}</p>
                </div>
                {canUpload ? <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300"><input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onUpload(pendency, file); }} />Anexar termo</label> : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
function RequestList({ requests, users, userId, onDecide, emptyText }: { requests: EquipmentRequest[]; users: EquipmentUser[]; userId: string; onDecide: (id: number, approve: boolean, termFile?: File | null, confirmMissingTerm?: boolean) => Promise<void>; emptyText: string }) {
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<EquipmentRequest | null>(null);
  const currentPage = Math.min(page, getTotalPages(requests.length));
  const paginatedRequests = useMemo(() => paginate(requests, currentPage), [currentPage, requests]);

  if (!requests.length) {
    return <p className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {paginatedRequests.map((request) => {
        const requester = users.find((item) => item.id === request.requesterUserId) ?? null;
        return (
          <button
            key={request.id}
            type="button"
            onClick={() => setSelectedRequest(request)}
            className="group w-full cursor-pointer rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-left transition-colors hover:border-blue-500/40 hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            aria-label={`Abrir solicitação de ${request.equipmentName}`}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-slate-500">{statusLabel(request.status)}</p>
                <h4 className="font-semibold text-white">
                  {request.equipmentName} <span className="font-mono text-xs text-blue-400">{request.equipmentCode}</span>
                </h4>
                <p className="mt-1 text-sm text-slate-400">
                  De {request.fromUserName || "RAROTEC"} para {request.toUserName || "RAROTEC"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Solicitada em {formatDateTime(request.createdAt)}</p>
                {request.reason ? <p className="mt-1 text-xs text-slate-500">{request.reason}</p> : null}
              </div>
              <div className="flex flex-col items-start gap-3 lg:items-end">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/70 text-slate-500 transition-colors group-hover:border-blue-500/40 group-hover:text-blue-300" aria-hidden="true">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
                <RequesterBadge user={requester} name={request.requesterName} />
              </div>
            </div>
          </button>
        );
      })}
      <PaginationControls page={currentPage} totalItems={requests.length} onPageChange={setPage} itemLabel="solicitações" />
      {selectedRequest ? <RequestDecisionModal request={selectedRequest} userId={userId} onClose={() => setSelectedRequest(null)} onDecide={async (id, approve, termFile, confirmMissingTerm) => { await onDecide(id, approve, termFile, confirmMissingTerm); setSelectedRequest(null); }} /> : null}
    </div>
  );
}

function RequestDecisionModal({ request, userId, onClose, onDecide }: { request: EquipmentRequest; userId: string; onClose: () => void; onDecide: (id: number, approve: boolean, termFile?: File | null, confirmMissingTerm?: boolean) => Promise<void> }) {
  const [termFile, setTermFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const responsibleUserId = request.type === "obtain" ? request.fromUserId : request.toUserId;
  const canDecide = request.status === "pending" && responsibleUserId === userId && request.requesterUserId !== userId;
  const termType = request.type === "obtain" ? "devolution" : "responsibility";
  const termTitle = termType === "responsibility" ? "Termo de responsabilidade" : "Termo de devolução";
  const existingDecisionTerm = termType === "responsibility" ? request.responsibilityTermUrl : request.devolutionTermUrl;

  const decide = async (approve: boolean) => {
    if (saving) return;
    if (approve && request.equipmentRequiresResponsibilityTerm && !termFile && !existingDecisionTerm) {
      const confirmed = window.confirm(`${termTitle} não anexado. Deseja aprovar mesmo assim?`);
      if (!confirmed) return;
      setSaving(true);
      await onDecide(request.id, approve, null, true);
      setSaving(false);
      return;
    }
    setSaving(true);
    await onDecide(request.id, approve, termFile, false);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-slate-500">Solicitação</p><h3 className="text-xl font-bold text-white">{request.equipmentName} <span className="font-mono text-sm text-blue-400">{request.equipmentCode}</span></h3></div><button onClick={onClose} className="text-2xl leading-none text-slate-400 transition-colors hover:text-white">×</button></div>
        <div className="space-y-2 text-sm text-slate-400"><p>De {request.fromUserName || "RAROTEC"} para {request.toUserName || "RAROTEC"}</p><p>Solicitação por {request.requesterName}</p>{request.reason ? <p>Motivo: {request.reason}</p> : null}</div>
        {canDecide && request.equipmentRequiresResponsibilityTerm ? <ActionRequestTermUpload title={termTitle} subtitle={`Insira aqui seu ${termTitle.toLowerCase()}`} file={termFile} onFileChange={setTermFile} /> : null}
        {canDecide ? <div className="mt-6 flex justify-center gap-3"><button disabled={saving} onClick={() => void decide(false)} className="rounded-lg border border-rose-500/30 px-4 py-2 text-sm text-rose-300 transition-colors hover:bg-rose-500/10 disabled:opacity-60">Rejeitar transferência</button><button disabled={saving} onClick={() => void decide(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-60">Aprovar transferência</button></div> : null}
      </div>
    </div>
  );
}

function ActionRequestTermUpload({ title, subtitle, file, onFileChange }: { title: string; subtitle: string; file: File | null; onFileChange: (file: File | null) => void }) {
  return <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/35 px-3 py-3"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-sm font-medium text-slate-300">{title}</p><p className="mt-0.5 truncate text-xs text-slate-500">{file?.name ?? subtitle}</p></div><label className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition-colors hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300" title={title}><input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} /><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94a3 3 0 114.243 4.243L8.56 18.31a1.5 1.5 0 11-2.121-2.121l9.192-9.193" /></svg></label></div></div>;
}
function RequesterBadge({ user, name }: { user: EquipmentUser | null; name: string }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
  return (
    <div className="flex items-center gap-2 self-end text-xs text-slate-500">
      <span>Solicitação por {name}</span>
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 bg-cover bg-center text-[10px] font-bold text-slate-200"
        style={user?.avatar_url ? { backgroundImage: `url(${user.avatar_url})` } : undefined}
        aria-hidden="true"
      >
        {user?.avatar_url ? null : initials}
      </span>
    </div>
  );
}
function statusLabel(status: EquipmentRequest["status"]) {
  if (status === "pending") return "Pendente";
  if (status === "approved") return "Aprovada";
  if (status === "rejected") return "Rejeitada";
  return "Cancelada";
}








