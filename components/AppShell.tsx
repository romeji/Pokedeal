import Link from "next/link";
import { AccountControl } from "@/components/navigation/AccountControl";
import { MobileNav } from "@/components/navigation/MobileNav";
import { auth } from "@/auth";
export async function AppShell({ children }:{ children:React.ReactNode }) {
  const session = await auth().catch(() => null);
  const isAdmin = session?.user?.role === "ADMIN";
  return <div className="pokedeal-shell min-h-screen min-w-0 overflow-x-hidden md:grid md:grid-cols-[240px_minmax(0,1fr)]">
    <aside className="desktop-sidebar m-3 hidden min-w-0 px-5 py-5 md:sticky md:top-3 md:flex md:h-[calc(100vh-24px)] md:flex-col md:items-stretch">
      <Link href="/dashboard" className="brand-mark shrink-0"><span>POKÉ</span>DEAL</Link>
      <nav className="mt-6 flex min-w-0 flex-1 flex-col gap-2 text-sm">
        <Link className="nav-link" href="/dashboard"><span>🏠</span>Accueil</Link>
        <Link className="nav-link" href="/library"><span>🏷️</span>Deals</Link>
        <Link className="nav-link" href="/collection"><span>🗂️</span>Collection</Link>
        <Link className="nav-link" href="/portfolio"><span>◈</span>Portefeuille</Link>
        <Link className="nav-link" href="/items"><span>🔎</span>Recherche de prix</Link>
        <Link className="nav-link" href="/profile"><span>👤</span>Profil</Link>
        {isAdmin&&<Link className="nav-link" href="/settings"><span>⚙️</span>Configuration</Link>}
      </nav>
      <AccountControl />
      <div className="sidebar-foot hidden text-xs leading-5 md:block">Prix Cardmarket · Visuels <a href="https://www.tcgdex.net" target="_blank" rel="noreferrer">TCGdex</a><br />Telegram actif</div>
    </aside>
    <div className="min-w-0 pb-24 md:pb-0">{children}</div>
    <MobileNav />
  </div>;
}
