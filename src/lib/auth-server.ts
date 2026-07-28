import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  AppRole,
  getRolePermissions,
  parseAppRole,
  roleConfigs,
} from "@/lib/roles";

export const AUTH_COOKIE_NAME = "rarostock_session";
export const SSO_STATE_COOKIE_NAME = "rarostock_sso_state";
const LEGACY_ROLE_COOKIE_NAME = "rarostock_role";
const PERSISTENT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10;

export type StockSession = {
  role: AppRole;
  user?: {
    id: string;
    nome: string;
    email: string;
  };
  issuedAt: number;
  expiresAt: number;
};

export type AuthSuccess = { role: AppRole };
export type AuthResult = AuthSuccess | { response: NextResponse };

export function isDebugAuthEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_DEBUG_AUTH === "true"
  );
}

function getSessionSecret() {
  return process.env.RAROSTOCK_SESSION_SECRET || "rarostock-dev-session-secret";
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function encodeSession(session: StockSession) {
  const payload = base64UrlEncode(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(value?: string | null): StockSession | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;

  try {
    const session = JSON.parse(base64UrlDecode(payload)) as StockSession;
    if (!parseAppRole(session.role) || session.expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export function createStockSession(role: AppRole, user?: StockSession["user"]): StockSession {
  const issuedAt = Date.now();
  return {
    role,
    user,
    issuedAt,
    expiresAt: issuedAt + PERSISTENT_SESSION_MAX_AGE_SECONDS * 1000,
  };
}

export function setSessionCookie(response: NextResponse, session: StockSession) {
  response.cookies.set(AUTH_COOKIE_NAME, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PERSISTENT_SESSION_MAX_AGE_SECONDS,
  });
  response.cookies.delete(LEGACY_ROLE_COOKIE_NAME);
}

export function clearSessionCookies(response: NextResponse) {
  response.cookies.delete(AUTH_COOKIE_NAME);
  response.cookies.delete(LEGACY_ROLE_COOKIE_NAME);
}

export function getSessionFromRequest(request: NextRequest): StockSession | null {
  return decodeSession(request.cookies.get(AUTH_COOKIE_NAME)?.value);
}

export function getRoleFromRequest(request: NextRequest): AppRole | null {
  return getSessionFromRequest(request)?.role ?? null;
}

export function buildSessionPayload(role: AppRole, session?: StockSession | null) {
  return {
    authenticated: true,
    role,
    label: roleConfigs[role].label,
    description: roleConfigs[role].description,
    user: session?.user ?? null,
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
