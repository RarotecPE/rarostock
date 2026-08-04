import { NextRequest, NextResponse } from "next/server";
import { buildSessionPayload, clearSessionCookies, getSessionFromRequest } from "@/lib/auth-server";
import { canAccessApp } from "@/lib/roles";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  const role = session?.role ?? null;

  if (!role || !canAccessApp(role)) {
    const response = NextResponse.json({
      authenticated: false,
      role: null,
      permissions: {
        canAccessApp: false,
        canView: false,
        canManageStock: false,
        canExport: false,
      },
    });
    clearSessionCookies(response);
    return response;
  }

  return NextResponse.json(buildSessionPayload(role, session));
}
