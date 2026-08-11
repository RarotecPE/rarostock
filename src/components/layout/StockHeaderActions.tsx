"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { HeaderDropdown, HeaderIconButton } from "@/components/layout/HeaderDropdown";
import { type ColorTheme } from "@/components/theme/ThemeBootstrap";
import { EquipmentRequest, formatLimit } from "@/types/stock";

type SessionUser = {
  id: string;
  nome: string;
  email: string;
  avatar_url?: string | null;
};

type AlertItem = {
  id: number;
  code: string;
  name: string;
  quantity: number;
  minimumLimit: number | null;
  desiredLimit: number | null;
  status: string;
};

type HeaderApplication = {
  nome: string;
  client_id: string;
  logo_url: string | null;
  homepage_url: string;
};

type ApplicationsPayload = {
  applications?: HeaderApplication[];
  nexusProfileUrl?: string;
  error?: string;
};

type StockHeaderActionsProps = {
  user: SessionUser | null;
  roleLabel: string;
  theme: ColorTheme;
  alerts: AlertItem[];
  requestAlerts: EquipmentRequest[];
  unavailableCount: number;
  belowMinCount: number;
  onToggleTheme: () => void;
  onLogout: () => void;
};

type OpenMenu = "applications" | "notifications" | "account" | null;

function AppsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function ThemeIcon({ theme }: { theme: ColorTheme }) {
  return theme === "light" ? (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.752 15.002A9.718 9.718 0 0118 15.75a9.75 9.75 0 01-9.75-9.75c0-1.33.266-2.598.748-3.752A9.753 9.753 0 003 11.25 9.75 9.75 0 0012.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  ) : (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364l-1.414 1.414M7.05 16.95l-1.414 1.414m12.728 0l-1.414-1.414M7.05 7.05L5.636 5.636M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
    </svg>
  );
}

function HeaderUserAvatar({ user }: { user: SessionUser | null }) {
  const [failed, setFailed] = useState(false);
  const avatarUrl = user?.avatar_url || "";
  const showImage = avatarUrl && !failed;
  const fallback = user?.nome?.trim().charAt(0).toUpperCase() || "U";

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-800 text-sm font-semibold text-slate-300">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        fallback
      )}
    </span>
  );
}

function ApplicationLogo({ application }: { application: HeaderApplication }) {
  const [failed, setFailed] = useState(false);
  const showImage = application.logo_url && !failed;

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50 text-xs font-semibold text-slate-300">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={application.logo_url!}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        application.nome.trim().charAt(0).toUpperCase()
      )}
    </span>
  );
}

export function StockHeaderActions({
  user,
  roleLabel,
  theme,
  alerts,
  requestAlerts,
  unavailableCount,
  belowMinCount,
  onToggleTheme,
  onLogout,
}: StockHeaderActionsProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [applications, setApplications] = useState<HeaderApplication[]>([]);
  const [nexusProfileUrl, setNexusProfileUrl] = useState("");
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState("");
  const displayName = user?.nome || "Usuário";
  const totalAlerts = alerts.length + requestAlerts.length;

  const closeMenu = useCallback(() => setOpenMenu(null), []);

  const loadApplications = useCallback(async () => {
    setAppsLoading(true);
    setAppsError("");

    try {
      const response = await fetch("/api/auth/applications", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as ApplicationsPayload | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Não foi possível carregar os aplicativos.");
      }

      setApplications(payload?.applications ?? []);
      setNexusProfileUrl(payload?.nexusProfileUrl ?? "");
    } catch (error) {
      setAppsError(error instanceof Error ? error.message : "Não foi possível carregar os aplicativos.");
    } finally {
      setAppsLoading(false);
    }
  }, []);

  function openDropdown(menu: Exclude<OpenMenu, null>) {
    setOpenMenu((current) => {
      const next = current === menu ? null : menu;
      if ((menu === "applications" || menu === "account") && next === menu && !appsLoading && !nexusProfileUrl) {
        void loadApplications();
      }
      return next;
    });
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <div className="relative">
        <HeaderIconButton
          label="Notificações"
          active={openMenu === "notifications"}
          onClick={() => openDropdown("notifications")}
        >
          <span className="relative inline-flex">
            <BellIcon />
            {totalAlerts > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                {totalAlerts > 9 ? "9+" : totalAlerts}
              </span>
            )}
          </span>
        </HeaderIconButton>

        <HeaderDropdown open={openMenu === "notifications"} onClose={closeMenu}>
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <h3 className="font-semibold text-white">Notificações</h3>
            <span className="text-xs text-slate-500">
              {totalAlerts} notificação{totalAlerts !== 1 ? "s" : ""}
            </span>
          </div>

          {totalAlerts === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500">
              <svg className="mx-auto mb-2 h-10 w-10 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">Nenhuma notificação no momento</p>
            </div>
          ) : (
            <>
              <div className="max-h-80 overflow-y-auto">
                {requestAlerts.map((request) => (
                  <Link
                    key={`request-${request.id}`}
                    href="/pessoal"
                    onClick={closeMenu}
                    className="block border-b border-slate-800/50 px-4 py-3 transition-colors hover:bg-slate-800/30"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/15 text-blue-300">
                        <BellIcon />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-white">Solicitação de equipamento</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-400">{request.equipmentName} {request.equipmentCode ? `(${request.equipmentCode})` : ""}</span>
                        <span className="mt-1 block text-xs text-slate-500">Solicitação por {request.requesterName}</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {(unavailableCount > 0 || belowMinCount > 0) ? <div className="flex items-center gap-4 bg-slate-800/30 px-4 py-3 text-xs">
                {unavailableCount > 0 && (
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    {unavailableCount} Indisponível
                  </span>
                )}
                {belowMinCount > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    {belowMinCount} Abaixo do Mínimo
                  </span>
                )}
              </div> : null}

              <div className="max-h-80 overflow-y-auto">
                {alerts.map((item) => (
                  <div
                    key={item.id}
                    className="border-b border-slate-800/50 px-4 py-3 transition-colors hover:bg-slate-800/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-blue-400">{item.code}</p>
                        <p className="truncate text-sm text-white">{item.name}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Estoque: {item.quantity} | Mín: {formatLimit(item.minimumLimit)}
                        </p>
                      </div>
                      <span
                        className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                          item.quantity === 0
                            ? "border-rose-500/30 bg-rose-500/15 text-rose-300"
                            : "border-amber-500/30 bg-amber-500/15 text-amber-300"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </HeaderDropdown>
      </div>

      <HeaderIconButton
        label={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
        onClick={onToggleTheme}
      >
        <ThemeIcon theme={theme} />
      </HeaderIconButton>

      <div className="relative">
        <HeaderIconButton
          label="Aplicativos"
          active={openMenu === "applications"}
          onClick={() => openDropdown("applications")}
        >
          <AppsIcon />
        </HeaderIconButton>

        <HeaderDropdown open={openMenu === "applications"} onClose={closeMenu}>
          <div className="border-b border-slate-800 px-4 py-3">
            <h3 className="font-semibold text-white">Aplicativos</h3>
            <p className="text-xs text-slate-500">Sistemas disponíveis para sua conta</p>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {appsLoading ? (
              <p className="px-3 py-4 text-sm text-slate-400">Carregando aplicativos...</p>
            ) : appsError ? (
              <div className="space-y-3 px-3 py-4">
                <p className="text-sm text-rose-300">{appsError}</p>
                <button className="btn-secondary min-h-9 px-3 py-1.5 text-xs" type="button" onClick={() => void loadApplications()}>
                  Tentar novamente
                </button>
              </div>
            ) : applications.length === 0 ? (
              <p className="px-3 py-4 text-sm text-slate-400">Nenhum outro aplicativo disponível.</p>
            ) : (
              applications.map((application) => (
                <a
                  key={application.client_id}
                  href={application.homepage_url}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-800/50"
                >
                  <ApplicationLogo application={application} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">{application.nome}</span>
                  </span>
                </a>
              ))
            )}
          </div>
        </HeaderDropdown>
      </div>


      <div className="relative">
        <button
          type="button"
          onClick={() => openDropdown("account")}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-85"
          aria-label="Conta do usuário"
          title="Conta do usuário"
        >
          <HeaderUserAvatar user={user} />
        </button>

        <HeaderDropdown open={openMenu === "account"} onClose={closeMenu}>
          <div className="border-b border-slate-800 px-4 py-4">
            <div className="flex items-center gap-3">
              <HeaderUserAvatar user={user} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-600">Perfil no RaroStock</p>
              <p className="text-sm font-medium text-slate-200">{roleLabel}</p>
            </div>
          </div>
          <div className="space-y-2 p-2">
            {nexusProfileUrl ? (
              <a
                href={nexusProfileUrl}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800/50 hover:text-white"
              >
                Editar perfil
                <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <button
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white"
                type="button"
                onClick={() => void loadApplications()}
              >
                {appsLoading ? "Carregando perfil..." : "Carregar perfil"}
              </button>
            )}
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-300 transition-colors hover:bg-rose-500/10 hover:text-rose-200"
              type="button"
              onClick={onLogout}
            >
              <LogoutIcon />
              Sair
            </button>
          </div>
        </HeaderDropdown>
      </div>
    </div>
  );
}
