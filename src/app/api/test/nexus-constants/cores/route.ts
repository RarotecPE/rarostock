import { NextResponse } from "next/server";
import { isHomologEnvironment } from "@/lib/environment";

function getEnv(name: string, fallback?: string) {
  const value = process.env[name] || fallback;
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function readNexusError(response: Response) {
  const payload = await response.json().catch(() => null) as {
    message?: string;
  } | null;
  return payload?.message ?? "Não foi possível carregar as cores pelo RaroNexus.";
}

export async function GET() {
  if (!isHomologEnvironment()) {
    return new NextResponse(null, { status: 404 });
  }

  const nexusBaseUrl = new URL(getEnv("RARONEXUS_BASE_URL", "http://localhost:3001"));

  try {
    // Como a constante 'cores' é PÚBLICA, nenhuma autenticação/sessão é necessária
    const stableResponse = await fetch(
      new URL("/api/constants/cores", nexusBaseUrl),
      {
        cache: "no-store",
        redirect: "manual",
      },
    );

    let contentResponse = stableResponse;
    if (stableResponse.status >= 300 && stableResponse.status < 400) {
      const location = stableResponse.headers.get("location");
      if (!location) {
        return NextResponse.json(
          { error: "O Nexus não informou a versão atual da constante." },
          { status: 502 },
        );
      }

      const versionUrl = new URL(location, nexusBaseUrl);
      if (versionUrl.origin !== nexusBaseUrl.origin) {
        return NextResponse.json(
          { error: "O Nexus retornou um destino inválido para a constante." },
          { status: 502 },
        );
      }

      // Requisição pública ao endpoint de conteúdo versionado, sem credenciais
      contentResponse = await fetch(versionUrl, {
        cache: "no-store",
      });
    }

    if (!contentResponse.ok) {
      return NextResponse.json(
        { error: await readNexusError(contentResponse) },
        { status: contentResponse.status || 502 },
      );
    }

    const content = await contentResponse.text();
    const data = JSON.parse(content) as unknown;

    return NextResponse.json(
      {
        data,
        version: contentResponse.headers.get("x-constant-version"),
        hash: contentResponse.headers.get("x-constant-hash"),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("nexus_cores_constant_failed", error);
    return NextResponse.json(
      { error: "Não foi possível carregar as cores pelo RaroNexus." },
      { status: 502 },
    );
  }
}
