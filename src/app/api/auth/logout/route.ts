import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookies, getGlobalSessionToken, revokeGlobalSession } from "@/lib/auth-server";

export async function POST(request: NextRequest) {
  const token = getGlobalSessionToken(request);
  if (token) await revokeGlobalSession(token);

  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
