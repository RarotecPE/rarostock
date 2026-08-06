import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { SSO_STATE_COOKIE_NAME } from "@/lib/auth-server";

function getEnv(name: string, fallback?: string) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export async function GET(request: NextRequest) {
  const nexusBaseUrl = getEnv("RARONEXUS_BASE_URL", "http://localhost:3001");
  const stockBaseUrl = getEnv("RAROSTOCK_BASE_URL", request.nextUrl.origin);
  const clientId = getEnv("RARONEXUS_CLIENT_ID", "rarostock");
  const mode = request.nextUrl.searchParams.get("mode") === "silent" ? "silent" : "interactive";
  const state = `${mode}.${crypto.randomBytes(24).toString("base64url")}`;
  const redirectUri = `${stockBaseUrl}/api/auth/raronexus/callback`;

  const authorizeUrl = new URL("/sso/authorize", nexusBaseUrl);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("state", state);
  if (mode === "silent") authorizeUrl.searchParams.set("prompt", "none");

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(SSO_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 5 * 60,
  });
  return response;
}

