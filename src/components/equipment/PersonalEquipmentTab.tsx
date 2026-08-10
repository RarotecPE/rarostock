"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Equipment, EquipmentRequest, EquipmentUser, holderLabel } from "@/types/stock";
import { Toast } from "@/components/ui/Toast";
import { useStockSession } from "@/components/layout/StockAppShell";
import { EquipmentDetailModal } from "@/components/equipment/EquipmentTab";

type ToastState = { message: string; type?: "success" | "error" } | null;

export function PersonalEquipmentTab() {
  const { user, isAdmin, canMutateStock } = useStockSession();
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [users, setUsers] = useState<EquipmentUser[]>([]);
  const [requests, setRequests] = useState<EquipmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestHistory, setShowRequestHistory] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [equipmentRes, requestsRes, usersRes] = await Promise.all([
      fetch("/api/equipments"),
      fetch("/api/equipment-requests?scope=mine&status=all"),
      fetch("/api/equipment-users"),
    ]);
    const [equipmentData, requestData, usersData] = await Promise.all([
      equipmentRes.json().catch(() => []),
      requestsRes.json().catch(() => []),
      usersRes.json().catch(() => ({ users: [] })),
    ]);
    if (!equipmentRes.ok || !requestsRes.ok) {
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
    setUsers(Array.isArray(usersData?.users) ? usersData.users : []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests],
  );
  const historicalRequests = useMemo(
    () => requests.filter((request) => request.status !== "pending"),
    [requests],
  );

  const decide = async (id: number, approve: boolean) => {
    const res = await fetch(`/api/equipment-requests/${id}/${approve ? "approve" : "reject"}`, {
      method: "POST",
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

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast.message} type={toast.type ?? "success"} onClose={() => setToast(null)} /> : null}
      <div className="text-center lg:text-left">
        <h2 className="text-2xl font-bold text-white">Pessoal</h2>
        <p className="mt-1 text-sm text-slate-400">Seus equipamentos e solicitações.</p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Carregando...</div>
      ) : (
        <>
          <section className="space-y-3">
            <h3 className="font-semibold text-white">Equipamentos com você</h3>
            {equipments.length ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {equipments.map((equipment) => (
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
                    <p className="mt-3 text-xs text-slate-500">Clique para devolver ou transferir.</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-500">
                Nenhum equipamento associado a você.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-semibold text-white">Solicitações pendentes</h3>
              <button
                type="button"
                onClick={() => setShowRequestHistory((value) => !value)}
                className="self-start rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-400 transition-colors hover:border-slate-700 hover:text-white sm:self-auto"
              >
                {showRequestHistory ? "Ocultar histórico" : `Ver histórico (${historicalRequests.length})`}
              </button>
            </div>
            <RequestList requests={pendingRequests} users={users} userId={user?.id ?? ""} isAdmin={isAdmin} onDecide={decide} emptyText="Nenhuma solicitação pendente." />
          </section>

          {showRequestHistory ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300">Histórico de solicitações</h3>
              <RequestList requests={historicalRequests} users={users} userId={user?.id ?? ""} isAdmin={isAdmin} onDecide={decide} emptyText="Nenhuma solicitação concluída." />
            </section>
          ) : null}
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

function RequestList({ requests, users, userId, isAdmin, onDecide, emptyText }: { requests: EquipmentRequest[]; users: EquipmentUser[]; userId: string; isAdmin: boolean; onDecide: (id: number, approve: boolean) => Promise<void>; emptyText: string }) {
  if (!requests.length) {
    return <p className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => {
        const responsibleUserId = request.type === "obtain" ? request.fromUserId : request.toUserId;
        const canDecide = request.status === "pending" && (isAdmin || responsibleUserId === userId);
        const requester = users.find((item) => item.id === request.requesterUserId) ?? null;
        return (
          <div key={request.id} className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500">{statusLabel(request.status)}</p>
                <h4 className="font-semibold text-white">
                  {request.equipmentName} <span className="font-mono text-xs text-blue-400">{request.equipmentCode}</span>
                </h4>
                <p className="mt-1 text-sm text-slate-400">
                  De {request.fromUserName || "RAROTEC"} para {request.toUserName || "RAROTEC"}
                </p>
                {request.reason ? <p className="mt-1 text-xs text-slate-500">{request.reason}</p> : null}
              </div>
              <div className="flex flex-col items-start gap-3 lg:items-end">
                {canDecide ? (
                  <div className="flex gap-2">
                    <button onClick={() => void onDecide(request.id, false)} className="rounded-lg border border-rose-500/30 px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10">
                      Rejeitar
                    </button>
                    <button onClick={() => void onDecide(request.id, true)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                      Aprovar
                    </button>
                  </div>
                ) : null}
                <RequesterBadge user={requester} name={request.requesterName} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
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
