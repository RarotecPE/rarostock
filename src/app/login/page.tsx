"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [ssoLoading, setSsoLoading] = useState(false);
  const [checkingNexusSession, setCheckingNexusSession] = useState(true);
  const [silentSsoUrl, setSilentSsoUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const popupRef = useRef<Window | null>(null);
  const popupCheckRef = useRef<number | null>(null);

  const stopPopupCheck = () => {
    if (popupCheckRef.current !== null) {
      window.clearInterval(popupCheckRef.current);
      popupCheckRef.current = null;
    }
  };

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== "raronexus:sso") return;

      stopPopupCheck();
      if (event.data.mode !== "silent") {
        setSsoLoading(false);
        popupRef.current = null;
      }
      setCheckingNexusSession(false);

      if (event.data.status === "success") {
        router.replace("/");
        return;
      }

      if (event.data.mode !== "silent") {
        setError(event.data.message || "Nao foi possivel entrar com RaroNexus.");
      }
    }

    async function tryExistingSessions() {
      const response = await fetch("/api/auth/session").catch(() => null);
      const session = response?.ok ? await response.json().catch(() => null) : null;

      if (session?.authenticated && session.role) {
        router.replace("/");
        return;
      }

      setSilentSsoUrl(`/api/auth/raronexus/start?mode=silent&attempt=${Date.now()}`);
      window.setTimeout(() => setCheckingNexusSession(false), 4500);
    }

    window.addEventListener("message", handleMessage);
    void tryExistingSessions();
    return () => {
      window.removeEventListener("message", handleMessage);
      stopPopupCheck();
    };
  }, [router]);

  const startRaroNexusLogin = () => {
    setError("");
    setMessage("");
    setSsoLoading(true);

    const popup = window.open(
      "/api/auth/raronexus/start",
      "raronexus-login",
      "width=520,height=720,menubar=no,toolbar=no,location=no,status=no"
    );

    if (!popup) {
      setSsoLoading(false);
      setError("Permita popups para entrar com RaroNexus.");
      return;
    }

    popupRef.current = popup;
    stopPopupCheck();
    popupCheckRef.current = window.setInterval(() => {
      if (!popupRef.current?.closed) return;
      stopPopupCheck();
      popupRef.current = null;
      setSsoLoading(false);
    }, 500);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <img
            src="/rarostock-logo.png"
            alt="RaroStock"
            className="mx-auto h-16 w-16 rounded-2xl bg-white object-contain"
          />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Raro<span className="text-blue-400">Stock</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Entre com sua conta RaroNexus para acessar a plataforma.
            </p>
          </div>
        </div>

        <section className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl">
          <button
            type="button"
            onClick={startRaroNexusLogin}
            disabled={ssoLoading || checkingNexusSession}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-500"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4v-3.586l5.257-5.257A6 6 0 1121 9z" />
            </svg>
            {ssoLoading ? "Aguardando RaroNexus..." : checkingNexusSession ? "Verificando RaroNexus..." : "Entrar com RaroNexus"}
          </button>

          {silentSsoUrl ? <iframe title="Verificacao RaroNexus" src={silentSsoUrl} className="hidden" /> : null}

          {(message || error) && (
            <p
              className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                error
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  : "border-blue-500/30 bg-blue-500/10 text-blue-300"
              }`}
            >
              {error || message}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
