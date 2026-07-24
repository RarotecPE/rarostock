"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { CadastroTab } from "@/components/tabs/CadastroTab";
import { AquisicaoTab } from "@/components/tabs/AquisicaoTab";
import { BaixaTab } from "@/components/tabs/BaixaTab";
import { DashboardTab } from "@/components/tabs/DashboardTab";
import { Item, getStockStatus, formatMinimumLimit } from "@/types/stock";

type Tab = "cadastro" | "aquisicao" | "baixa" | "dashboard";

const tabs: { key: Tab; label: string; icon: ReactNode }[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    key: "cadastro",
    label: "Cadastro",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    key: "aquisicao",
    label: "Aquisição",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    key: "baixa",
    label: "Baixa",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
];

interface AlertItem {
  id: number;
  code: string;
  name: string;
  quantity: number;
  minimumLimit: number | null;
  status: "Indisponível" | "Abaixo do Mínimo";
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [alertItems, setAlertItems] = useState<AlertItem[]>([]);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/items");
      const items: Item[] = await res.json();
      const alerts: AlertItem[] = items
        .filter((i) => {
          const st = getStockStatus(i.quantity, i.minimumLimit);
          return st === "Indisponível" || st === "Abaixo do Mínimo";
        })
        .map((i) => ({
          id: i.id,
          code: i.code,
          name: i.name,
          quantity: i.quantity,
          minimumLimit: i.minimumLimit,
          status: getStockStatus(i.quantity, i.minimumLimit) as "Indisponível" | "Abaixo do Mínimo",
        }));
      setAlertItems(alerts);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const unavailableCount = alertItems.filter((a) => a.status === "Indisponível").length;
  const belowMinCount = alertItems.filter((a) => a.status === "Abaixo do Mínimo").length;
  const totalAlerts = alertItems.length;

  return (
    <div className="min-h-screen flex">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900/95 backdrop-blur border-r border-slate-800 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
            <img
              src="/rarostock-logo.svg"
              alt="RaroStock"
              className="w-11 h-11 rounded-xl bg-white object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Raro<span className="text-blue-400">Stock</span>
              </h1>
              <p className="text-xs text-slate-500">Gestão de Estoque</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-slate-800">
            <p className="text-xs text-slate-600 text-center">
              RaroStock v1.0
            </p>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Page title - desktop only */}
            <div className="hidden lg:block">
              <h2 className="text-lg font-semibold text-white">
                {tabs.find((t) => t.key === activeTab)?.label}
              </h2>
            </div>

            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <img
                src="/rarostock-logo.svg"
                alt="RaroStock"
                className="w-9 h-9 rounded-lg bg-white object-contain"
              />
              <span className="text-lg font-bold text-white">
                Raro<span className="text-blue-400">Stock</span>
              </span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {totalAlerts > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-5 h-5 bg-rose-500 rounded-full text-xs text-white font-medium flex items-center justify-center">
                    {totalAlerts > 9 ? "9+" : totalAlerts}
                  </span>
                )}
              </button>

              {/* Notifications dropdown */}
              {showNotifications && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowNotifications(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                      <h3 className="font-semibold text-white">Notificações</h3>
                      <span className="text-xs text-slate-500">
                        {totalAlerts} alerta{totalAlerts !== 1 ? "s" : ""}
                      </span>
                    </div>
                    
                    {alertItems.length === 0 ? (
                      <div className="px-4 py-8 text-center text-slate-500">
                        <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm">Nenhum alerta no momento</p>
                      </div>
                    ) : (
                      <>
                        {/* Summary */}
                        <div className="px-4 py-3 bg-slate-800/30 flex items-center gap-4 text-xs">
                          {unavailableCount > 0 && (
                            <span className="flex items-center gap-1.5 text-rose-400">
                              <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                              {unavailableCount} indisponível
                            </span>
                          )}
                          {belowMinCount > 0 && (
                            <span className="flex items-center gap-1.5 text-amber-400">
                              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                              {belowMinCount} abaixo do mínimo
                            </span>
                          )}
                        </div>

                        {/* Alert list */}
                        <div className="max-h-80 overflow-y-auto">
                          {alertItems.map((item) => (
                            <div
                              key={item.id}
                              className="px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs text-blue-400 font-mono">
                                    {item.code}
                                  </p>
                                  <p className="text-sm text-white truncate">
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    Estoque: {item.quantity} | Mín: {formatMinimumLimit(item.minimumLimit)}
                                  </p>
                                </div>
                                <span
                                  className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                                    item.status === "Indisponível"
                                      ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                                      : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
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
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
          {activeTab === "dashboard" && <DashboardTab />}
          {activeTab === "cadastro" && <CadastroTab />}
          {activeTab === "aquisicao" && <AquisicaoTab />}
          {activeTab === "baixa" && <BaixaTab />}
        </main>

        {/* Bottom Navigation - Mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800">
          <div className="flex items-center justify-around h-16">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeTab === tab.key
                    ? "text-blue-400"
                    : "text-slate-500"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
