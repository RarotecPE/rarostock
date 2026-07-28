export const APP_ROLES = [
  "admin",
  "gestor",
  "visualizador",
  "nao_autorizado",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const roleConfigs: Record<AppRole, { label: string; description: string }> = {
  admin: {
    label: "Admin",
    description: "Acesso total",
  },
  gestor: {
    label: "Gestor",
    description: "Cadastro, movimentacoes e visualizacao",
  },
  visualizador: {
    label: "Visualizador",
    description: "Apenas visualizacao e exportacao",
  },
  nao_autorizado: {
    label: "Nao Autorizado",
    description: "Sem acesso ao RaroStock",
  },
};

export function parseAppRole(value: unknown): AppRole | null {
  return typeof value === "string" && APP_ROLES.includes(value as AppRole)
    ? (value as AppRole)
    : null;
}

export function canAccessApp(role: AppRole | null): boolean {
  return role === "admin" || role === "gestor" || role === "visualizador";
}

export function canView(role: AppRole | null): boolean {
  return canAccessApp(role);
}

export function canManageStock(role: AppRole | null): boolean {
  return role === "admin" || role === "gestor";
}

export function canExport(role: AppRole | null): boolean {
  return canAccessApp(role);
}

export function getRolePermissions(role: AppRole | null) {
  return {
    canAccessApp: canAccessApp(role),
    canView: canView(role),
    canManageStock: canManageStock(role),
    canExport: canExport(role),
  };
}
