import { NextRequest, NextResponse } from "next/server";
import { buildSessionPayload, getRoleFromRequest } from "@/lib/auth-server";
import { canAccessApp } from "@/lib/roles";

export async function GET(request: NextRequest) {
  const role = getRoleFromRequest(request);

  if (!role || !canAccessApp(role)) {
    return NextResponse.json({
      authenticated: false,
      role: null,
      permissions: {
        canAccessApp: false,
        canView: false,
        canManageStock: false,
        canExport: false,
      },
    });
  }

  return NextResponse.json(buildSessionPayload(role));
}
