import { NextRequest, NextResponse } from "next/server";
import {
  AppRole,
  getRolePermissions,
  parseAppRole,
  roleConfigs,
} from "@/lib/roles";

export const AUTH_COOKIE_NAME = "rarostock_global_session";
export const SSO_STATE_COOKIE_NAME = "rarostock_sso_state";
const LEGACY_SESSION_COOKIE_NAME = "rarostock_session";
const LEGACY_ROLE_COOKIE_NAME = "rarostock_role";
const PERSISTENT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10;

export type SessionUser = {
  id: string;
  nome: string;
  email: string;
  avatar_url?: string | null;
};

export type NexusSession = {
  role: AppRole;
  user: SessionUser;
};

export type AuthSuccess = NexusSession;
export type AuthResult = AuthSuccess | { response: NextResponse };

type NexusIntrospectionResponse = {
  success: boolean;
  message?: string;
  data?: {
    active: boolean;
    user: SessionUser;
    role: {
      id: string;
      nome: string;
      chave: string;
    };
  };
};

function getEnv(name: string, fallback?: string) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PERSISTENT_SESSION_MAX_AGE_SECONDS,
  });
  response.cookies.delete(LEGACY_SESSION_COOKIE_NAME);
  response.cookies.delete(LEGACY_ROLE_COOKIE_NAME);
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.delete(AUTH_COOKIE_NAME);
  response.cookies.delete(LEGACY_SESSION_COOKIE_NAME);
  response.cookies.delete(LEGACY_ROLE_COOKIE_NAME);
}

export function getGlobalSessionToken(request: NextRequest) {
  return request.cookies.get(AUTH_COOKIE_NAME)?.value ?? null;
}

export async function revokeGlobalSession(token: string) {
  const nexusBaseUrl = getEnv("RARONEXUS_BASE_URL", "http://localhost:3001");
  await fetch(new URL("/api/v1/sessions/revoke", nexusBaseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
    cache: "no-store",
  }).catch(() => null);
}

export async function getSessionFromRequest(request: NextRequest): Promise<NexusSession | null> {
  const token = getGlobalSessionToken(request);
  if (!token) return null;

  let response: Response;
  let payload: NexusIntrospectionResponse | null;

  try {
    const nexusBaseUrl = getEnv("RARONEXUS_BASE_URL", "http://localhost:3001");
    const clientId = getEnv("RARONEXUS_CLIENT_ID", "rarostock");
    response = await fetch(new URL("/api/v1/sessions/introspect", nexusBaseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, client_id: clientId }),
      cache: "no-store",
    });
    payload = (await response.json().catch(() => null)) as NexusIntrospectionResponse | null;
  } catch (error) {
    console.error("raronexus_session_introspection_failed", error);
    return null;
  }

  if (!response.ok || !payload?.success || !payload.data?.active) return null;

  const role = parseAppRole(payload.data.role.chave);
  if (!role) return null;

  return {
    role,
    user: payload.data.user,
  };
}

export function buildSessionPayload(role: AppRole, session?: NexusSession | null) {
  return {
    authenticated: true,
    role,
    label: roleConfigs[role].label,
    description: roleConfigs[role].description,
    user: session?.user ?? null,
    permissions: getRolePermissions(role),
  };
}

export async function requirePermission(
  request: NextRequest,
  predicate: (role: AppRole | null) => boolean,
  forbiddenMessage = "Permissao insuficiente para esta operacao."
): Promise<AuthResult> {
  const session = await getSessionFromRequest(request);
  const role = session?.role ?? null;

  if (!role) {
    const response = NextResponse.json(
      { error: "Sessao nao encontrada." },
      { status: 401 }
    );
    clearSessionCookies(response);
    return { response };
  }

  if (!predicate(role)) {
    return {
      response: NextResponse.json({ error: forbiddenMessage }, { status: 403 }),
    };
  }

  return session!;
}

export function hasAuthError(result: AuthResult): result is { response: NextResponse } {
  return "response" in result;
}


