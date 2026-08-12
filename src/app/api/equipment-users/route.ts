import { NextRequest, NextResponse } from "next/server";
import { hasAuthError, requirePermission } from "@/lib/auth-server";
import { canView } from "@/lib/roles";

type NexusAuthorizedUser = {
  id: string;
  nome: string;
  email: string;
  avatar_url?: string | null;
};

type NexusAuthorizedUsersPayload = {
  success?: boolean;
  data?: NexusAuthorizedUser[];
  message?: string;
};

function getEnv(name: string, fallback?: string) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, canView);
  if (hasAuthError(auth)) return auth.response;

  const fallback = [{
    id: auth.user.id,
    nome: auth.user.nome,
    email: auth.user.email,
    avatar_url: auth.user.avatar_url ?? null,
  }];

  try {
    const nexusBaseUrl = getEnv("RARONEXUS_BASE_URL", "http://localhost:3001");
    const clientId = getEnv("RARONEXUS_CLIENT_ID", "rarostock");
    const clientSecret = getEnv("RARONEXUS_CLIENT_SECRET");

    const response = await fetch(new URL("/api/v1/applications/authorized-users", nexusBaseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null) as NexusAuthorizedUsersPayload | null;
    if (!response.ok || !payload?.success || !Array.isArray(payload.data)) {
      return NextResponse.json({ users: fallback, warning: payload?.message ?? "Não foi possível carregar usuários do Nexus." });
    }

    const users = payload.data
      .map((user) => ({
        id: user.id,
        nome: user.nome || user.email || "Usuário",
        email: user.email || "",
        avatar_url: user.avatar_url ?? null,
      }))
      .filter((user) => user.id && user.email);

    return NextResponse.json({ users: users.length ? users : fallback });
  } catch (error) {
    console.error("raronexus_authorized_users_fetch_failed", error);
    return NextResponse.json({ users: fallback, warning: "Não foi possível carregar usuários do Nexus." });
  }
}
