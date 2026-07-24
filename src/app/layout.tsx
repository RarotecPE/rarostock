import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "RaroStock — Gestão de Estoque",
  description: "Plataforma de controle interno e gestão de processos operacionais de estoque.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#0B0F17] text-slate-200 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
