import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  buildSessionPayload,
  isDebugAuthEnabled,
} from "@/lib/auth-server";
import { canAccessApp, parseAppRole } from "@/lib/roles";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

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
    return NextResponse.json({ error: "Role invalida." }, { status: 400 });
  }

  if (!canAccessApp(role)) {
    const response = NextResponse.json(
      { error: "Usuario nao autorizado para acessar o RaroStock." },
      { status: 403 }
    );
    response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  const response = NextResponse.json(buildSessionPayload(role));
  response.cookies.set(AUTH_COOKIE_NAME, role, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
