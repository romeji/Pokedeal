import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { PwaRegister } from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "Pokémon Deal Scanner",
  description: "Surveillance des opportunités Pokémon sur Vinted vs Cardmarket",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "PokéDeal" },
};

export const viewport: Viewport = { themeColor: "#262b36" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body><PwaRegister /><AppShell>{children}</AppShell></body>
    </html>
  );
}
