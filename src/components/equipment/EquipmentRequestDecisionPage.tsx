"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Toast } from "@/components/ui/Toast";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { useStockSession } from "@/components/layout/StockAppShell";
import { EquipmentRequest } from "@/types/stock";

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

function statusLabel(status: EquipmentRequest["status"]) {
  if (status === "pending") return "Pendente";
  if (status === "approved") return "Aprovada";
  if (status === "rejected") return "Rejeitada";
  return "Cancelada";
}

function termLabel(type: EquipmentRequest["type"]) {
  return type === "obtain" ? "Termo de devolucao" : "Termo de responsabilidade";
}

export function EquipmentRequestDecisionPage({ requestId }: { requestId: number }) {
  const { user } = useStockSession();
  const [request, setRequest] = useState<EquipmentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [termFile, setTermFile] = useState<File | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/equipment-requests/${requestId}`);
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setRequest(null);
      setToast({ message: payload?.error ?? "Nao foi possivel carregar a solicitacao.", type: "error" });
      setLoading(false);
      return;
    }
    setRequest(payload);
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const decision = useMemo(() => {
    if (!request || !user?.id) {
      return { responsibleUserId: null, canDecide: false, termTitle: "Termo" };
    }
    const responsibleUserId = request.type === "obtain" ? request.fromUserId : request.toUserId;
    return {
      responsibleUserId,
      canDecide: request.status === "pending" && responsibleUserId === user.id && request.requesterUserId !== user.id,
      termTitle: termLabel(request.type),
    };
  }, [request, user?.id]);

  async function decide(approve: boolean, confirmMissingTerm = false) {
    if (!request || saving) return;

    const existingDecisionTerm = request.type === "obtain" ? request.devolutionTermUrl : request.responsibilityTermUrl;
    if (approve && request.equipmentRequiresResponsibilityTerm && !termFile && !existingDecisionTerm && !confirmMissingTerm) {
      const confirmed = window.confirm(`${decision.termTitle} nao anexado. Deseja aprovar mesmo assim?`);
      if (!confirmed) return;
      await decide(true, true);
      return;
    }

    setSaving(true);
    const formData = new FormData();
    if (termFile) formData.append("termFile", termFile);
    if (confirmMissingTerm) formData.append("confirmMissingTerm", "true");

    const res = await fetch(`/api/equipment-requests/${request.id}/${approve ? "approve" : "reject"}`, {
      method: "POST",
      body: formData,
    });
    const payload = await res.json().catch(() => null);
    setSaving(false);

    if (!res.ok) {
      setToast({ message: payload?.error ?? "Nao foi possivel atualizar a solicitacao.", type: "error" });
      return;
    }

    setTermFile(null);
    setToast({ message: approve ? "Solicitacao aprovada." : "Solicitacao rejeitada." });
    await load();
  }

  return (
    <div className="space-y-6">
      {toast ? <Toast message={toast.message} type={toast.type ?? "success"} onClose={() => setToast(null)} /> : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-left">
          <h2 className="text-2xl font-bold text-white">Solicitacao de equipamento</h2>
          <p className="mt-1 text-sm text-slate-400">Revise a solicitacao recebida antes de decidir.</p>
        </div>
        <RefreshButton onClick={() => void load()} />
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Carregando...</div>
      ) : request ? (
        <section className="panel mx-auto max-w-3xl p-5 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-xs text-blue-400">{request.equipmentCode}</p>
              <h3 className="mt-1 text-2xl font-bold text-white">{request.equipmentName}</h3>
              <p className="mt-2 text-sm text-slate-400">Status: {statusLabel(request.status)}</p>
            </div>
            {request.equipmentRequiresResponsibilityTerm ? (
              <span className="w-fit rounded-full border border-amber-400/35 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                Exige termo
              </span>
            ) : null}
          </div>

          <div className="grid gap-4 py-5 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">De</p>
              <p className="mt-1 text-slate-200">{request.fromUserName || "RAROTEC"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Para</p>
              <p className="mt-1 text-slate-200">{request.toUserName || "RAROTEC"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Solicitacao por</p>
              <p className="mt-1 text-slate-200">{request.requesterName}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">Solicitada em</p>
              <p className="mt-1 text-slate-200">{formatDateTime(request.createdAt)}</p>
            </div>
            {request.reason ? (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wider text-slate-500">Motivo</p>
                <p className="mt-1 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-slate-300">{request.reason}</p>
              </div>
            ) : null}
          </div>

          {decision.canDecide && request.equipmentRequiresResponsibilityTerm ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950/35 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-300">{decision.termTitle}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {termFile?.name ?? `Insira aqui seu ${decision.termTitle.toLowerCase()}`}
                  </p>
                </div>
                <label className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition-colors hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-300" title={decision.termTitle}>
                  <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(event) => setTermFile(event.target.files?.[0] ?? null)} />
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94a3 3 0 114.243 4.243L8.56 18.31a1.5 1.5 0 11-2.121-2.121l9.192-9.193" />
                  </svg>
                </label>
              </div>
            </div>
          ) : null}

          {decision.canDecide ? (
            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <button disabled={saving} onClick={() => void decide(false)} className="cursor-pointer rounded-lg border border-rose-500/30 px-4 py-2 text-sm text-rose-300 transition-colors hover:bg-rose-500/10 disabled:cursor-wait disabled:opacity-60">
                Rejeitar transferencia
              </button>
              <button disabled={saving} onClick={() => void decide(true)} className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">
                Aprovar transferencia
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-slate-800 bg-slate-950/35 p-4 text-sm text-slate-400">
              {request.status === "pending" ? "Voce pode visualizar esta solicitacao, mas nao e o responsavel por decidir." : "Esta solicitacao ja foi concluida."}
            </div>
          )}

          <div className="mt-5 flex justify-center">
            <Link href="/pessoal" className="text-sm text-blue-300 transition-colors hover:text-blue-200">
              Abrir tela Pessoal
            </Link>
          </div>
        </section>
      ) : (
        <section className="panel mx-auto max-w-2xl p-6 text-center">
          <h3 className="text-lg font-semibold text-white">Solicitacao não encontrada</h3>
          <p className="mt-2 text-sm text-slate-400">Ela pode ter sido removida ou voce nao tem acesso para visualiza-la.</p>
          <Link href="/pessoal" className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500">
            Voltar para Pessoal
          </Link>
        </section>
      )}
    </div>
  );
}