"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { InstallPromptCard } from "@/components/pwa/InstallPromptCard";
import { StockHeaderActions } from "@/components/layout/StockHeaderActions";
import {
  applyColorTheme,
  getStoredColorTheme,
  storeColorTheme,
  type ColorTheme,
} from "@/components/theme/ThemeBootstrap";
import { AppRole, canAdmin, canManageStock, roleConfigs } from "@/lib/roles";
import { EquipmentRequest, getStockStatus, Item, StockStatus } from "@/types/stock";

type SessionUser = {
  id: string;
  nome: string;
  email: string;
  avatar_url?: string | null;
};

type StockSessionContextValue = {
  role: AppRole;
  user: SessionUser | null;
  canMutateStock: boolean;
  canDeleteInvoice: boolean;
  isAdmin: boolean;
};

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
};

type AlertItem = {
  id: number;
  code: string;
  name: string;
  quantity: number;
  minimumLimit: number | null;
  desiredLimit: number | null;
  status: StockStatus;
};

const StockSessionContext = createContext<StockSessionContextValue | null>(null);

const navigationItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: "/produtos",
    label: "Produto",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7.5l-8-4-8 4m16 0l-8 4m8-4v9l-8 4m0-9l-8-4m8 4v9m-8-13v9l8 4" />
      </svg>
    ),
  },
  {
    href: "/aquisicoes",
    label: "Aquisição",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: "/baixas",
    label: "Baixa",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
  {
    href: "/equipamentos",
    label: "Equipamentos",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 104 0m-7-3h10l1-9H5l1 9zm0 0l-1 4h12l-1-4" />
      </svg>
    ),
  },
  {
    href: "/pessoal",
    label: "Pessoal",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A7 7 0 0112 15a7 7 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },  {
    href: "/configuracoes/catalogo",
    label: "Configurações",
    adminOnly: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.607 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function useStockSession() {
  const session = useContext(StockSessionContext);
  if (!session) {
    throw new Error("useStockSession must be used inside StockAppShell");
  }
  return session;
}

export function StockAppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<AppRole | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<ColorTheme>(() => getStoredColorTheme());
  const [alertItems, setAlertItems] = useState<AlertItem[]>([]);
  const [requestAlerts, setRequestAlerts] = useState<EquipmentRequest[]>([]);

  const isAdmin = canAdmin(role);
  const canMutateStock = canManageStock(role);
  const roleInfo = role ? roleConfigs[role] : null;
  const visibleNavigationItems = useMemo(
    () => navigationItems.filter((item) => !item.adminOnly || isAdmin),
    [isAdmin]
  );
  const currentRoute =
    navigationItems.find((item) => isActivePath(pathname, item.href)) ??
    navigationItems[0];
  const unavailableCount = alertItems.filter((item) => item.quantity === 0).length;
  const belowMinCount = alertItems.filter(
    (item) => item.status === "Abaixo do Mínimo"
  ).length;

  useEffect(() => {
    let active = true;

    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((session) => {
        if (!active) return;

        if (!session.authenticated || !session.role) {
          router.replace("/login");
          return;
        }

        setRole(session.role as AppRole);
        setSessionUser(session.user ?? null);
      })
      .catch(() => {
        if (active) router.replace("/login");
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    let redirecting = false;

    window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const isInternalApi =
        url.startsWith("/api/") || url.startsWith(`${window.location.origin}/api/`);

      if (
        response.status === 401 &&
        isInternalApi &&
        !url.includes("/api/auth/logout") &&
        !redirecting
      ) {
        redirecting = true;
        await originalFetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        router.replace("/login");
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);

  const fetchAlerts = useCallback(async () => {
    try {
      const [itemsRes, requestsRes] = await Promise.all([
        fetch("/api/items"),
        fetch("/api/equipment-requests?scope=notifications&status=pending"),
      ]);

      if (itemsRes.ok) {
        const items: Item[] = await itemsRes.json();
        setAlertItems(
          items
            .filter(
              (item) =>
                item.quantity === 0 ||
                getStockStatus(item.quantity, item.minimumLimit, item.desiredLimit) === "Abaixo do Mínimo"
            )
            .map((item) => ({
              id: item.id,
              code: item.code,
              name: item.name,
              quantity: item.quantity,
              minimumLimit: item.minimumLimit,
              desiredLimit: item.desiredLimit,
              status: getStockStatus(item.quantity, item.minimumLimit, item.desiredLimit),
            }))
        );
      }

      if (requestsRes.ok) {
        const requests: EquipmentRequest[] = await requestsRes.json();
        setRequestAlerts(Array.isArray(requests) ? requests : []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!role) return undefined;

    const initialFetch = setTimeout(fetchAlerts, 0);
    const interval = setInterval(fetchAlerts, 30000);

    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [fetchAlerts, role]);

  useEffect(() => {
    applyColorTheme(theme);
  }, [theme]);

  function toggleTheme() {
    const nextTheme: ColorTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    storeColorTheme(nextTheme);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  }

  if (checkingSession || !role || !roleInfo) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          Verificando sessão...
        </div>
      </main>
    );
  }

  const sessionValue: StockSessionContextValue = {
    role,
    user: sessionUser,
    canMutateStock,
    canDeleteInvoice: isAdmin,
    isAdmin,
  };

  return (
    <StockSessionContext.Provider value={sessionValue}>
      <div className="min-h-screen flex">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 h-screen w-64 bg-slate-900/95 backdrop-blur border-r border-slate-800 transform transition-transform duration-200 lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            <Link
              href="/dashboard"
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-5 py-5 border-b border-slate-800 text-left transition-colors hover:bg-slate-800/40"
              aria-label="Voltar para o Dashboard"
            >
              <Image
                src="/rarostock-logo.png"
                alt="RaroStock"
                width={44}
                height={44}
                className="w-11 h-11 rounded-xl bg-white object-contain"
              />
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Raro<span className="text-blue-400">Stock</span>
                </h1>
                <p className="text-xs text-slate-500">Gestão de Estoque</p>
              </div>
            </Link>

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {visibleNavigationItems
                .filter((item) => !item.adminOnly)
                .map((item) => {
                  const active = isActivePath(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
            </nav>

            {visibleNavigationItems
              .filter((item) => item.adminOnly)
              .map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <div key={item.href} className="mt-auto border-t border-slate-800 px-3 py-4">
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </div>
                );
              })}

          </div>
        </aside>

        <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
          <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800">
            <div className="relative flex items-center justify-between px-4 sm:px-6 h-16">
              <div className="flex items-center gap-1 lg:hidden">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                  aria-label="Abrir menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>

              <div className="hidden lg:block">
                <h2 className="text-lg font-semibold text-white">{currentRoute.label}</h2>
              </div>

              <StockHeaderActions
                user={sessionUser}
                roleLabel={roleInfo.label}
                theme={theme}
                alerts={alertItems}
                requestAlerts={requestAlerts}
                unavailableCount={unavailableCount}
                belowMinCount={belowMinCount}
                onToggleTheme={toggleTheme}
                onLogout={handleLogout}
              />
            </div>
          </header>

          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
            {children}
          </main>

          <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800">
            <div className="flex items-center justify-around h-16">
              {visibleNavigationItems
                .filter((item) => !item.adminOnly)
                .map((item) => {
                  const active = isActivePath(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        active ? "text-blue-400" : "text-slate-500"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
            </div>
          </nav>

          <InstallPromptCard />
        </div>
      </div>
    </StockSessionContext.Provider>
  );
}


