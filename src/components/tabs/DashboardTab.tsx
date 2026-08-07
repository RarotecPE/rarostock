"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Item } from "@/types/stock";

type MonthlyFlowPoint = {
  month: string;
  entradas: number;
  baixas: number;
};

type MonthlyValuePoint = {
  month: string;
  valor: number;
};

type TopProductPoint = {
  code: string;
  name: string;
  quantity: number;
};

type DistributionPoint = {
  name: string;
  value: number;
};

type DashboardAnalytics = {
  monthlyFlow: MonthlyFlowPoint[];
  monthlyAcquisitionValue: MonthlyValuePoint[];
  topIssuedProducts: TopProductPoint[];
  topPurchasedProducts: TopProductPoint[];
  stockStatus: DistributionPoint[];
  categoryDistribution: DistributionPoint[];
};

type QuickAccessPath = "/produtos" | "/aquisicoes" | "/baixas";

type DashboardTabProps = {
  onNavigate: (path: QuickAccessPath) => void;
  canManageStock: boolean;
};

const STATUS_COLORS = ["#34d399", "#f59e0b", "#fb7185"];
const CATEGORY_COLORS = [
  "#60a5fa",
  "#22d3ee",
  "#a78bfa",
  "#f472b6",
  "#facc15",
  "#4ade80",
  "#fb923c",
  "#94a3b8",
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const formatProductChartLabel = (value: string) =>
  value.length > 22 ? `${value.slice(0, 22)}...` : value;

const quickAccessItems: {
  key: QuickAccessPath;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
}[] = [
  {
    key: "/produtos",
    title: "Produto",
    description: "Cadastrar e gerenciar produtos",
    accent: "text-blue-400 bg-blue-500/15 border-blue-500/30 group-hover:border-blue-400/50",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7.5l-8-4-8 4m16 0l-8 4m8-4v9l-8 4m0-9l-8-4m8 4v9m-8-13v9l8 4" />
      </svg>
    ),
  },
  {
    key: "/aquisicoes",
    title: "Aquisição",
    description: "Registrar entradas no estoque",
    accent: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30 group-hover:border-emerald-400/50",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    key: "/baixas",
    title: "Baixa",
    description: "Registrar saídas de itens",
    accent: "text-rose-400 bg-rose-500/15 border-rose-500/30 group-hover:border-rose-400/50",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
];

function ChartCard({
  title,
  children,
  empty,
}: {
  title: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-white mb-4">{title}</h3>
      {empty ? (
        <div className="h-72 flex items-center justify-center text-sm text-slate-500">
          Sem dados para exibir
        </div>
      ) : (
        <div className="h-72">{children}</div>
      )}
    </div>
  );
}

export function DashboardTab({ onNavigate, canManageStock }: DashboardTabProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/items")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setItems(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    fetch("/api/dashboard/analytics")
      .then((res) => {
        if (!res.ok) throw new Error("Dashboard analytics request failed");
        return res.json();
      })
      .then((data: DashboardAnalytics) => {
        if (!active) return;
        setAnalytics(data);
        setAnalyticsError(false);
        setAnalyticsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setAnalyticsError(true);
        setAnalyticsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const totalItems = items.length;
  const unavailable = items.filter((item) => item.quantity === 0).length;
  const belowMin = items.filter(
    (item) =>
      item.quantity > 0 &&
      item.minimumLimit !== null &&
      item.quantity < item.minimumLimit
  ).length;
  const inStock = totalItems - belowMin - unavailable;
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const alertCount = belowMin + unavailable;

  const hasMonthlyFlow =
    analytics?.monthlyFlow.some((point) => point.entradas > 0 || point.baixas > 0) ??
    false;
  const hasMonthlyValue =
    analytics?.monthlyAcquisitionValue.some((point) => point.valor > 0) ?? false;
  const hasTopIssued =
    analytics?.topIssuedProducts.some((point) => point.quantity > 0) ?? false;
  const hasTopPurchased =
    analytics?.topPurchasedProducts.some((point) => point.quantity > 0) ?? false;
  const hasStatus =
    analytics?.stockStatus.some((point) => point.value > 0) ?? false;
  const hasCategories =
    analytics?.categoryDistribution.some((point) => point.value > 0) ?? false;

  return (
    <div className="space-y-6">
      <div className="text-center lg:text-left">
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-slate-400 text-sm mt-1">
          Visao geral dos saldos, alertas e analises mensais do estoque
        </p>
      </div>

      <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4">
          <h3 className="text-lg font-semibold text-white">Acesso Rápido</h3>
          <p className="text-sm text-slate-500">
            Escolha uma ação para continuar
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quickAccessItems.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className="group flex items-center justify-between gap-4 rounded-lg border border-slate-800 bg-slate-800/40 px-4 py-4 text-left transition-all hover:border-slate-700 hover:bg-slate-800"
            >
              <span className="flex items-center gap-3 min-w-0">
                <span
                  className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border transition-colors ${item.accent}`}
                >
                  {item.icon}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-white">
                    {item.title}
                  </span>
                  <span className="block text-sm text-slate-400">
                    {canManageStock
                      ? item.description
                      : item.key === "/produtos"
                        ? "Consultar produtos e detalhes"
                        : item.key === "/aquisicoes"
                          ? "Consultar entradas registradas"
                          : "Consultar baixas registradas"}
                  </span>
                </span>
              </span>
              <svg
                className="w-5 h-5 flex-shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Produtos
              </p>
              <p className="text-3xl font-bold text-white mt-1">{totalItems}</p>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Unidades
              </p>
              <p className="text-3xl font-bold text-blue-400 mt-1">{totalUnits}</p>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Em Estoque
              </p>
              <p className="text-3xl font-bold text-emerald-400 mt-1">{inStock}</p>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">
                Alertas
              </p>
              <p className="text-3xl font-bold text-amber-400 mt-1">{alertCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">Abaixo do minimo</p>
              <p className="text-4xl font-bold text-amber-400 mt-2">{belowMin}</p>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">Indisponiveis</p>
              <p className="text-4xl font-bold text-rose-400 mt-2">{unavailable}</p>
            </div>
          </div>
        </>
      )}

      <section className="space-y-4">
        <div className="text-center lg:text-left">
          <h2 className="text-xl font-bold text-white">Analises mensais</h2>
          <p className="text-slate-400 text-sm mt-1">
            Ultimos 12 meses, incluindo o mes atual
          </p>
        </div>

        {analyticsLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : analyticsError || !analytics ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 text-sm text-rose-300">
            Nao foi possivel carregar as analises do Dashboard.
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartCard title="Entradas vs baixas por mes" empty={!hasMonthlyFlow}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.monthlyFlow}>
                  <CartesianGrid stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Legend />
                  <Bar dataKey="entradas" name="Entradas" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="baixas" name="Baixas" fill="#fb7185" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Valor de aquisicoes por mes" empty={!hasMonthlyValue}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.monthlyAcquisitionValue}>
                  <CartesianGrid stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(Number(value))}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="valor"
                    name="Valor"
                    stroke="#34d399"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top produtos com mais saida" empty={!hasTopIssued}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topIssuedProducts} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatProductChartLabel(String(value))}
                    width={150}
                  />
                  <Tooltip
                    formatter={(value, _name, item) => [
                      value,
                      `${item.payload.name} (${item.payload.code})`,
                    ]}
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Bar dataKey="quantity" name="Baixas" fill="#fb7185" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top produtos mais comprados" empty={!hasTopPurchased}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topPurchasedProducts} layout="vertical" margin={{ left: 12 }}>
                  <CartesianGrid stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatProductChartLabel(String(value))}
                    width={150}
                  />
                  <Tooltip
                    formatter={(value, _name, item) => [
                      value,
                      `${item.payload.name} (${item.payload.code})`,
                    ]}
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Bar dataKey="quantity" name="Compras" fill="#38bdf8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Status atual do estoque" empty={!hasStatus}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.stockStatus}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={3}
                  >
                    {analytics.stockStatus.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Distribuicao por categoria" empty={!hasCategories}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.categoryDistribution}>
                  <CartesianGrid stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Bar dataKey="value" name="Produtos" radius={[4, 4, 0, 0]}>
                    {analytics.categoryDistribution.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </section>
    </div>
  );
}
