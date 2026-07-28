import { NextRequest, NextResponse } from "next/server";
import {
  AppRole,
  getRolePermissions,
  parseAppRole,
  roleConfigs,
} from "@/lib/roles";

export const AUTH_COOKIE_NAME = "rarostock_role";

export type AuthSuccess = { role: AppRole };
export type AuthResult = AuthSuccess | { response: NextResponse };

export function isDebugAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_DEBUG_AUTH === "true"
  );
}

export function getRoleFromRequest(request: NextRequest): AppRole | null {
  return parseAppRole(request.cookies.get(AUTH_COOKIE_NAME)?.value);
}

export function buildSessionPayload(role: AppRole) {
  return {
    authenticated: true,
    role,
    label: roleConfigs[role].label,
    description: roleConfigs[role].description,
    permissions: getRolePermissions(role),
  };
}

export function requirePermission(
  request: NextRequest,
  predicate: (role: AppRole | null) => boolean,
  forbiddenMessage = "Permissao insuficiente para esta operacao."
): AuthResult {
  const role = getRoleFromRequest(request);

  if (!role) {
    return {
      response: NextResponse.json(
        { error: "Sessao nao encontrada." },
        { status: 401 }
      ),
    };
  }

  if (!predicate(role)) {
    return {
      response: NextResponse.json({ error: forbiddenMessage }, { status: 403 }),
    };
  }

  return { role };
}

export function hasAuthError(result: AuthResult): result is { response: NextResponse } {
  return "response" in result;
}
