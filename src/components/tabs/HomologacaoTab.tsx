"use client";

import { useEffect, useState } from "react";

type NexusConstantResponse = {
  data: unknown;
  version?: string | null;
  error?: string;
};

function extractItems(value: unknown, primaryKey: string): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  for (const key of [primaryKey, "data", "items", "results"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }

  return Object.entries(record).map(([key, item]) => (
    typeof item === "string" ? item : { key, value: item }
  ));
}

function itemLabel(value: unknown, index: number) {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["nome", "name", "municipio", "cor", "label", "descricao"]) {
      if (typeof record[key] === "string") return record[key];
    }
    return JSON.stringify(value);
  }
  return `Item ${index + 1}`;
}

export function HomologacaoTab() {
  const [municipios, setMunicipios] = useState<unknown[]>([]);
  const [municipiosVersion, setMunicipiosVersion] = useState<string | null>(null);
  const [municipiosLoading, setMunicipiosLoading] = useState(true);
  const [municipiosError, setMunicipiosError] = useState<string | null>(null);

  const [cores, setCores] = useState<unknown[]>([]);
  const [coresVersion, setCoresVersion] = useState<string | null>(null);
  const [coresLoading, setCoresLoading] = useState(true);
  const [coresError, setCoresError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/test/nexus-constants/municipios", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as NexusConstantResponse | null;
        if (!response.ok) {
          throw new Error(payload?.error ?? "Não foi possível carregar os municípios.");
        }
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setMunicipios(extractItems(payload?.data, "municipios"));
        setMunicipiosVersion(payload?.version ?? null);
        setMunicipiosError(null);
      })
      .catch((error) => {
        if (!active) return;
        setMunicipiosError(error instanceof Error ? error.message : "Não foi possível carregar os municípios.");
      })
      .finally(() => {
        if (active) setMunicipiosLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/test/nexus-constants/cores", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as NexusConstantResponse | null;
        if (!response.ok) {
          throw new Error(payload?.error ?? "Não foi possível carregar as cores.");
        }
        return payload;
      })
      .then((payload) => {
        if (!active) return;
        setCores(extractItems(payload?.data, "cores"));
        setCoresVersion(payload?.version ?? null);
        setCoresError(null);
      })
      .catch((error) => {
        if (!active) return;
        setCoresError(error instanceof Error ? error.message : "Não foi possível carregar as cores.");
      })
      .finally(() => {
        if (active) setCoresLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center lg:text-left">
        <div className="flex items-center justify-center gap-3 lg:justify-start">
          <h2 className="text-2xl font-bold text-white">Homologação</h2>
          <span className="rounded-md border border-amber-400/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
            Ambiente de Testes
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Área dedicada para validação e homologação de integrações com a API central do RaroNexus.
        </p>
      </div>

      {/* Seção Municípios (Constante Privada) */}
      <section className="rounded-xl border border-cyan-500/25 bg-slate-900/90 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">Municípios</h3>
              <span className="rounded border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                Teste Nexus
              </span>
              <span className="rounded border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                Privada
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Constante privada carregada pela API central do RaroNexus (requer autenticação)
            </p>
          </div>
          {municipiosVersion ? (
            <span className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400">
              Versão {municipiosVersion}
            </span>
          ) : null}
        </div>

        {municipiosLoading ? (
          <div className="flex min-h-28 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          </div>
        ) : municipiosError ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            {municipiosError}
          </div>
        ) : municipios.length === 0 ? (
          <p className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-500">
            A constante foi carregada, mas nenhum município foi identificado.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/40">
            <div className="grid gap-px bg-slate-800 sm:grid-cols-2 lg:grid-cols-3">
              {municipios.map((municipio, index) => {
                const label = itemLabel(municipio, index);
                return (
                  <div key={`${label}-${index}`} className="min-w-0 bg-slate-950/90 px-3 py-2.5">
                    <p className="truncate text-sm text-slate-200" title={label}>{label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Seção Cores (Constante Pública) */}
      <section className="rounded-xl border border-emerald-500/25 bg-slate-900/90 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">Cores</h3>
              <span className="rounded border border-cyan-400/25 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                Teste Nexus
              </span>
              <span className="rounded border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                Pública
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              Constante pública carregada pela API central do RaroNexus (sem necessidade de autenticação)
            </p>
          </div>
          {coresVersion ? (
            <span className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400">
              Versão {coresVersion}
            </span>
          ) : null}
        </div>

        {coresLoading ? (
          <div className="flex min-h-28 items-center justify-center">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          </div>
        ) : coresError ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            {coresError}
          </div>
        ) : cores.length === 0 ? (
          <p className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-500">
            A constante foi carregada, mas nenhuma cor foi identificada.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/40">
            <div className="grid gap-px bg-slate-800 sm:grid-cols-2 lg:grid-cols-3">
              {cores.map((cor, index) => {
                const label = itemLabel(cor, index);
                return (
                  <div key={`${label}-${index}`} className="min-w-0 bg-slate-950/90 px-3 py-2.5">
                    <p className="truncate text-sm text-slate-200" title={label}>{label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

