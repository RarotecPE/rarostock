import { NextRequest, NextResponse } from "next/server";
import {
  buildSessionPayload,
  clearSessionCookies,
  createStockSession,
  isDebugAuthEnabled,
  setSessionCookie,
} from "@/lib/auth-server";
import { canAccessApp, parseAppRole } from "@/lib/roles";

export async function POST(request: NextRequest) {
  if (!isDebugAuthEnabled()) {
    return NextResponse.json(
      { error: "Login de depuracao indisponivel neste ambiente." },
      { status: 404 }
    );
  }

  const body = await request.json().catch(() => null);
  const role = parseAppRole(body?.role);

  if (!role) {
    return NextResponse.json({ error: "Perfil de usuario invalido." }, { status: 400 });
  }

  if (!canAccessApp(role)) {
    const response = NextResponse.json(
      { error: "Usuario nao autorizado para acessar o RaroStock." },
      { status: 403 }
    );
    clearSessionCookies(response);
    return response;
  }

  const session = createStockSession(role, {
    id: `debug-${role}`,
    nome: role,
    email: `${role}@debug.local`,
  });
  const response = NextResponse.json(buildSessionPayload(role, session));
  setSessionCookie(response, session);
  return response;
}
