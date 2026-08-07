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
import { Item } from "@/types/stock";

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
  status: "Indisponível" | "Abaixo do Mínimo";
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

function UserAvatar({ user }: { user: SessionUser | null }) {
  const [failed, setFailed] = useState(false);
  const avatarUrl = user?.avatar_url || "";
  const showImage = avatarUrl && !failed;
  const fallback = user?.nome?.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-800 text-sm font-semibold text-slate-300">
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
    </div>
  );
}

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
    (item) =>
      item.quantity > 0 &&
      item.minimumLimit !== null &&
      item.quantity < item.minimumLimit
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
      const res = await fetch("/api/items");
      if (!res.ok) return;
      const items: Item[] = await res.json();
      setAlertItems(
        items
          .filter(
            (item) =>
              item.quantity === 0 ||
              (item.minimumLimit !== null && item.quantity < item.minimumLimit)
          )
          .map((item) => ({
            id: item.id,
            code: item.code,
            name: item.name,
            quantity: item.quantity,
            minimumLimit: item.minimumLimit,
            status: item.quantity === 0 ? "Indisponível" : "Abaixo do Mínimo",
          }))
      );
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
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 backdrop-blur border-r border-slate-800 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${
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

            <nav className="flex-1 px-3 py-4 space-y-1">
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
                  <div key={item.href} className="px-3 pb-4">
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

            <div className="px-5 py-4 border-t border-slate-800">
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
                <UserAvatar user={sessionUser} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {sessionUser?.nome ?? "Usuário"}
                  </p>
                  <p className="text-[11px] uppercase tracking-wider text-slate-600">
                    {roleInfo.label}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-400 transition-colors hover:border-slate-700 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                </svg>
                Sair
              </button>
              <p className="text-xs text-slate-600 text-center">RaroStock v1.0</p>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-h-screen">
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
