"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Acquisition, AcquisitionItemWithDetails, pluralizeUnit } from "@/types/stock";

interface Props {
  acquisitionId: number;
  onClose: () => void;
  onPreviewInvoice?: (url: string, filename?: string | null) => void;
  canManageStock: boolean;
  canDeleteInvoice: boolean;
  onInvoiceChanged?: () => void;
  onToast?: (toast: { message: string; type: "success" | "error" }) => void;
}

export function AcquisitionDetailModal({
  acquisitionId,
  onClose,
  onPreviewInvoice,
  canManageStock,
  canDeleteInvoice,
  onInvoiceChanged,
  onToast,
}: Props) {
  const [acquisition, setAcquisition] = useState<Acquisition | null>(null);
  const [acqItems, setAcqItems] = useState<AcquisitionItemWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [attaching, setAttaching] = useState(false);
  const [deletingInvoice, setDeletingInvoice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      const res = await fetch(`/api/acquisitions/${acquisitionId}`);
      const data = await res.json();
      setAcquisition(data.acquisition);
      setAcqItems(data.items);
      setLoading(false);
    };
    fetchDetail();
  }, [acquisitionId]);

  const handleAttachInvoice = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !acquisition || acquisition.invoiceUrl || attaching) return;

    setAttaching(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(uploadData.error ?? "Nao foi possivel enviar a nota fiscal.");
      }

      const invoiceRes = await fetch(`/api/acquisitions/${acquisitionId}/invoice`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceUrl: uploadData.url,
          invoiceFilename: uploadData.filename,
          invoiceStoragePath: uploadData.storagePath,
        }),
      });
      const invoiceData = await invoiceRes.json();

      if (!invoiceRes.ok) {
        throw new Error(invoiceData.error ?? "Nao foi possivel anexar a nota fiscal.");
      }

      setAcquisition(invoiceData.acquisition);
      onInvoiceChanged?.();
      onToast?.({ message: "Nota fiscal anexada com sucesso!", type: "success" });
    } catch (error) {
      onToast?.({
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel anexar a nota fiscal.",
        type: "error",
      });
    } finally {
      setAttaching(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!acquisition?.invoiceUrl || deletingInvoice) return;

    const confirmed = window.confirm("Excluir a nota fiscal desta aquisicao?");
    if (!confirmed) return;

    setDeletingInvoice(true);

    try {
      const res = await fetch(`/api/acquisitions/${acquisitionId}/invoice`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Nao foi possivel excluir a nota fiscal.");
      }

      setAcquisition(data.acquisition);
      onInvoiceChanged?.();
      onToast?.({ message: "Nota fiscal excluida com sucesso!", type: "success" });
    } catch (error) {
      onToast?.({
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel excluir a nota fiscal.",
        type: "error",
      });
    } finally {
      setDeletingInvoice(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-white">
            Aquisição #{acquisitionId}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : acquisition ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Data da Aquisição
                  </p>
                  <p className="text-white">
                    {new Date(acquisition.date).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(acquisition.date).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Registro no Sistema
                  </p>
                  <p className="text-white">
                    {new Date(acquisition.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(acquisition.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Valor Total
                  </p>
                  <p className="text-emerald-400 font-semibold">
                    R$ {parseFloat(acquisition.totalValue).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Invoice */}
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                  Nota Fiscal
                </p>
                {acquisition.invoiceUrl ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <button
                      onClick={() =>
                        onPreviewInvoice?.(
                          acquisition.invoiceUrl!,
                          acquisition.invoiceFilename
                        )
                      }
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {acquisition.invoiceFilename ?? "Visualizar Nota Fiscal"}
                    </button>
                    {canDeleteInvoice && (
                      <button
                        type="button"
                        onClick={handleDeleteInvoice}
                        disabled={deletingInvoice}
                        className="inline-flex items-center justify-center p-2 text-slate-500 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50"
                        aria-label="Excluir nota fiscal"
                        title="Excluir nota fiscal"
                      >
                        {deletingInvoice ? (
                          <span className="w-4 h-4 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m3 0V5a1 1 0 011-1h2a1 1 0 011 1v2" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <p className="text-sm text-slate-500">
                      Sem nota fiscal anexada
                    </p>
                    {canManageStock && (
                      <>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={handleAttachInvoice}
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={attaching}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors disabled:opacity-50"
                        >
                          {attaching ? (
                            <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          )}
                          Anexar nota fiscal
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3">
                  Itens da Aquisição
                </h3>
                <div className="space-y-2">
                  {acqItems.map((ai) => (
                    <div
                      key={ai.id}
                      className="flex items-center justify-between bg-slate-800/50 rounded-lg px-4 py-3"
                    >
                      <div>
                        <span className="text-blue-400 font-mono text-xs">
                          {ai.itemCode}
                        </span>
                        <span className="text-white ml-2">{ai.itemName}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-300">
                          {ai.quantity} {pluralizeUnit(ai.itemUnit, ai.quantity)} × R${" "}
                          {parseFloat(ai.unitPrice).toFixed(2)}
                        </p>
                        <p className="text-sm text-white font-medium">
                          R$ {parseFloat(ai.totalPrice).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-500">
              Aquisição não encontrada
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
