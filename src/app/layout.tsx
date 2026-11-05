import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AUREON XP — Evolua. Conquiste. Construa a Aureon.",
  description:
    "Plataforma exclusiva de gamificação empresarial da Aureon: XP, patentes, missões, conquistas e ranking interno da equipe.",
};

export const viewport: Viewport = {
  themeColor: "#050508",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-ink-950 text-white antialiased">{children}</body>
    </html>
  );
}
