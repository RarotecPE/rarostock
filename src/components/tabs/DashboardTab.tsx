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
import { getStockStatus, Item } from "@/types/stock";

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
  equipmentSummary: {
    total: number;
    allocated: number;
    available: number;
    totalValue: number;
  };
  equipmentHolderDistribution: DistributionPoint[];
  equipmentCategoryDistribution: DistributionPoint[];
  equipmentCategoryValue: DistributionPoint[];
};

type QuickAccessPath = "/produtos" | "/aquisições" | "/baixas" | "/equipamentos" | "/movimentacoes" | "/pessoal";

type QuickAccessGroup = {
  title: string;
  description: string;
  icon: React.ReactNode;
  accent: string;
  options: {
    key: QuickAccessPath;
    title: string;
    description: string;
    icon: React.ReactNode;
  }[];
};

type OpenQuickAccessGroup = "Produto" | "Equipamento" | null;

type DashboardTabProps = {
  onNavigate: (path: QuickAccessPath) => void;
  canManageStock: boolean;
};

const STATUS_COLORS = ["#34d399", "#22d3ee", "#f59e0b", "#fb7185"];
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
const EQUIPMENT_COLORS = ["#22d3ee", "#a78bfa", "#38bdf8", "#facc15", "#4ade80", "#fb923c"];

const productIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7.5l-8-4-8 4m16 0l-8 4m8-4v9l-8 4m0-9l-8-4m8 4v9m-8-13v9l8 4" />
  </svg>
);

const acquisitionIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const issueIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

const equipmentIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 104 0m-7-3h10l1-9H5l1 9zm0 0l-1 4h12l-1-4" />
  </svg>
);

const movementsIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4M16 17H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const personalIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A7 7 0 0112 15a7 7 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const quickAccessGroups: QuickAccessGroup[] = [
  {
    title: "Produto",
    description: "Produtos, entradas e saídas do estoque",
    accent: "text-blue-400 bg-blue-500/15 border-blue-500/30 group-hover:border-blue-400/50",
    icon: productIcon,
    options: [
      { key: "/produtos", title: "Catálogo", description: "Consultar e gerenciar produtos", icon: productIcon },
      { key: "/aquisições", title: "Aquisição", description: "Registrar entradas", icon: acquisitionIcon },
      { key: "/baixas", title: "Baixa", description: "Registrar saídas", icon: issueIcon },
    ],
  },
  {
    title: "Equipamento",
    description: "Patrimônios, movimentações e solicitações",
    accent: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30 group-hover:border-cyan-400/50",
    icon: equipmentIcon,
    options: [
      { key: "/equipamentos", title: "Catálogo", description: "Consultar equipamentos", icon: equipmentIcon },
      { key: "/movimentacoes", title: "Movimentações", description: "Ver histórico", icon: movementsIcon },
      { key: "/pessoal", title: "Pessoal", description: "Meus equipamentos", icon: personalIcon },
    ],
  },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const formatProductChartLabel = (value: string) =>
  value.length > 22 ? `${value.slice(0, 22)}...` : value;

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
  const [openQuickAccessGroup, setOpenQuickAccessGroup] = useState<OpenQuickAccessGroup>(null);

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
    (item) => getStockStatus(item.quantity, item.minimumLimit, item.desiredLimit) === "Abaixo do Mínimo"
  ).length;
  const belowDesired = items.filter(
    (item) => getStockStatus(item.quantity, item.minimumLimit, item.desiredLimit) === "Abaixo do Desejável"
  ).length;
  const inStock = totalItems - belowMin - belowDesired - unavailable;
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const alertCount = belowMin + belowDesired + unavailable;

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
  const hasEquipmentHolderDistribution =
    analytics?.equipmentHolderDistribution.some((point) => point.value > 0) ?? false;
  const hasEquipmentCategoryDistribution =
    analytics?.equipmentCategoryDistribution.some((point) => point.value > 0) ?? false;
  const hasEquipmentCategoryValue =
    analytics?.equipmentCategoryValue.some((point) => point.value > 0) ?? false;

  return (
    <div className="space-y-6">
      <div className="text-center lg:text-left">
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-slate-400 text-sm mt-1">
          Visão geral dos saldos, alertas e análises mensais do estoque
        </p>
      </div>

      <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-4">
          <h3 className="text-lg font-semibold text-white">Acesso Rápido</h3>
          <p className="text-sm text-slate-500">
            Escolha uma ação para continuar
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {quickAccessGroups.map((group) => {
            const open = openQuickAccessGroup === group.title;

            return (
              <div key={group.title} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenQuickAccessGroup(open ? null : group.title as OpenQuickAccessGroup)}
                  className={`group flex w-full items-center justify-between gap-4 rounded-lg border px-4 py-4 text-left transition-all ${open ? "border-blue-500/40 bg-blue-600/10" : "border-slate-800 bg-slate-800/40 hover:border-slate-700 hover:bg-slate-800"}`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border transition-colors ${group.accent}`}>
                      {group.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-white">{group.title}</span>
                      <span className="block text-sm text-slate-400">{group.description}</span>
                    </span>
                  </span>
                  <svg className={`h-5 w-5 flex-shrink-0 text-slate-500 transition-transform group-hover:text-slate-300 ${open ? "rotate-180 text-blue-300" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {open ? (
                  <div className="mt-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 p-2 shadow-xl">
                    {group.options.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => onNavigate(option.key)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-800/70"
                      >
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300">
                          {option.icon}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-white">{option.title}</span>
                          <span className="block text-xs text-slate-500">{canManageStock ? option.description : option.title === "Catálogo" ? "Consultar registros" : "Consultar histórico"}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>      </section>

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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">Abaixo do desejável</p>
              <p className="text-4xl font-bold text-cyan-400 mt-2">{belowDesired}</p>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">Abaixo do mínimo</p>
              <p className="text-4xl font-bold text-amber-400 mt-2">{belowMin}</p>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
              <p className="text-sm text-slate-400">Indisponíveis</p>
              <p className="text-4xl font-bold text-rose-400 mt-2">{unavailable}</p>
            </div>
          </div>
        </>
      )}

      <section className="space-y-4">
        <div className="text-center lg:text-left">
          <h2 className="text-xl font-bold text-white">Análises mensais</h2>
          <p className="text-slate-400 text-sm mt-1">
            Últimos 12 meses, incluindo o mês atual
          </p>
        </div>

        {analyticsLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : analyticsError || !analytics ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 text-sm text-rose-300">
            Não foi possível carregar as análises do Dashboard.
          </div>
        ) : (
          <>
          <section className="space-y-4">
            <div className="text-center lg:text-left">
              <h2 className="text-xl font-bold text-white">Equipamentos</h2>
              <p className="text-slate-400 text-sm mt-1">
                Visão geral dos patrimônios e investimento em equipamentos
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Equipamentos</p>
                <p className="text-3xl font-bold text-white mt-1">{analytics.equipmentSummary.total}</p>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Alocados</p>
                <p className="text-3xl font-bold text-cyan-400 mt-1">{analytics.equipmentSummary.allocated}</p>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Disponíveis</p>
                <p className="text-3xl font-bold text-emerald-400 mt-1">{analytics.equipmentSummary.available}</p>
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Total gasto</p>
                <p className="text-2xl font-bold text-blue-400 mt-1">{formatCurrency(analytics.equipmentSummary.totalValue)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <ChartCard title="Equipamentos por portador" empty={!hasEquipmentHolderDistribution}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.equipmentHolderDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={92}
                      paddingAngle={3}
                    >
                      {analytics.equipmentHolderDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={EQUIPMENT_COLORS[index % EQUIPMENT_COLORS.length]} />
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

              <ChartCard title="Equipamentos por categoria" empty={!hasEquipmentCategoryDistribution}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.equipmentCategoryDistribution}>
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
                    <Bar dataKey="value" name="Equipamentos" radius={[4, 4, 0, 0]}>
                      {analytics.equipmentCategoryDistribution.map((entry, index) => (
                        <Cell key={entry.name} fill={EQUIPMENT_COLORS[index % EQUIPMENT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Valor por categoria" empty={!hasEquipmentCategoryValue}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.equipmentCategoryValue} layout="vertical" margin={{ left: 12 }}>
                    <CartesianGrid stroke="#1e293b" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#94a3b8"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatCurrency(Number(value))}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#94a3b8"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatProductChartLabel(String(value))}
                      width={140}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value))}
                      contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Bar dataKey="value" name="Valor" fill="#38bdf8" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </section>

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

            <ChartCard title="Valor de aquisições por mes" empty={!hasMonthlyValue}>
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

            <ChartCard title="Top produtos com mais saída" empty={!hasTopIssued}>
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

            <ChartCard title="Distribuição por categoria" empty={!hasCategories}>
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
          </>
        )}
      </section>
    </div>
  );
}
