"use client";

import { useState, useEffect } from "react";
import { Acquisition, AcquisitionItemWithDetails, pluralizeUnit } from "@/types/stock";

interface Props {
  acquisitionId: number;
  onClose: () => void;
  onPreviewInvoice?: (url: string) => void;
}

export function AcquisitionDetailModal({ acquisitionId, onClose, onPreviewInvoice }: Props) {
  const [acquisition, setAcquisition] = useState<Acquisition | null>(null);
  const [acqItems, setAcqItems] = useState<AcquisitionItemWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

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
              {acquisition.invoiceUrl && (
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                    Nota Fiscal
                  </p>
                  <button
                    onClick={() => onPreviewInvoice?.(acquisition.invoiceUrl!)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-slate-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Visualizar Nota Fiscal
                  </button>
                </div>
              )}

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
