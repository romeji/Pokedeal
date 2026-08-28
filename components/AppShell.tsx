import Link from "next/link";
import { AccountControl } from "@/components/navigation/AccountControl";
import { MobileNav } from "@/components/navigation/MobileNav";
import { auth } from "@/auth";
export async function AppShell({ children }:{ children:React.ReactNode }) {
  const session = await auth().catch(() => null);
  const isAdmin = session?.user?.role === "ADMIN";
  return <div className="min-h-screen min-w-0 overflow-x-hidden md:grid md:grid-cols-[240px_minmax(0,1fr)]">
    <header className="mobile-header md:hidden"><Link href="/dashboard" className="font-display text-lg font-bold"><span className="text-cyan-300">POKÉ</span>DEAL</Link><div className="flex items-center gap-2">{isAdmin&&<Link href="/settings" className="account-pill" aria-label="Configuration">⚙</Link>}<AccountControl compact /></div></header>
    <aside className="glass-panel m-3 hidden min-w-0 rounded-3xl px-5 py-5 md:sticky md:top-3 md:flex md:h-[calc(100vh-24px)] md:flex-col md:items-stretch">
      <Link href="/dashboard" className="shrink-0 font-display text-lg font-bold tracking-tight"><span className="text-cyan-300">POKÉ</span>DEAL</Link>
      <nav className="mt-6 flex min-w-0 flex-1 flex-col gap-2 text-sm">
        <Link className="nav-link" href="/dashboard">Vue d’ensemble</Link>
        <Link className="nav-link" href="/library">Bibliothèque</Link>
        <Link className="nav-link" href="/collection">Collection</Link>
        <Link className="nav-link" href="/items">Prix</Link>
        <Link className="nav-link" href="/profile">Profil & favoris</Link>
        {isAdmin&&<Link className="nav-link" href="/settings">⚙ Configuration</Link>}
      </nav>
      <AccountControl />
      <div className="hidden text-xs leading-5 text-slate-500 md:block">Prix Cardmarket · Visuels <a className="text-cyan-300/70 hover:text-cyan-200" href="https://www.tcgdex.net" target="_blank" rel="noreferrer">TCGdex</a><br />Telegram actif</div>
    </aside>
    <div className="min-w-0 pb-24 md:pb-0">{children}</div>
    <MobileNav />
  </div>;
}
