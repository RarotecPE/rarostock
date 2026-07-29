import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "RaroStock",
  description:
    "Plataforma de controle interno e gestao de processos operacionais de estoque.",
  icons: {
    icon: [
      { url: "/rarostock-logo.png?v=3", type: "image/png" },
      { url: "/favicon.ico?v=3", sizes: "any" },
    ],
    shortcut: "/favicon.ico?v=3",
    apple: "/rarostock-logo.png?v=3",
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
