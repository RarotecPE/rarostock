import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "RaroStock - Gestao de Estoque",
  description:
    "Plataforma de controle interno e gestao de processos operacionais de estoque.",
  icons: {
    icon: [
      { url: "/icon.svg?v=2", type: "image/svg+xml" },
      { url: "/favicon.ico?v=2", sizes: "any" },
    ],
    shortcut: "/favicon.ico?v=2",
    apple: "/rarostock-logo.svg?v=2",
  },
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
