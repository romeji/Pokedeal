import Link from "next/link";
export function AppShell({ children }:{ children:React.ReactNode }) {
  return <div className="min-h-screen min-w-0 overflow-x-hidden md:grid md:grid-cols-[240px_minmax(0,1fr)]">
    <aside className="glass-panel m-3 flex min-w-0 items-center gap-4 overflow-hidden rounded-3xl px-5 py-4 md:sticky md:top-3 md:h-[calc(100vh-24px)] md:flex-col md:items-stretch md:overflow-visible">
      <Link href="/dashboard" className="shrink-0 font-display text-lg font-bold tracking-tight"><span className="text-cyan-300">POKÉ</span>DEAL</Link>
      <nav className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto text-sm md:flex-col md:overflow-visible">
        <Link className="nav-link" href="/dashboard">Vue d’ensemble</Link>
        <Link className="nav-link" href="/library">Bibliothèque</Link>
        <Link className="nav-link" href="/collection">Collection</Link>
        <Link className="nav-link" href="/items">Prix & favoris</Link>
        <Link className="nav-link" href="/admin/imports">Configuration</Link>
        <Link className="nav-link hidden md:block" href="/admin/monitors">Temps réel</Link>
        <Link className="nav-link hidden md:block" href="/admin/filters">Filtres</Link>
        <Link className="nav-link hidden md:block" href="/admin/system">Système</Link>
      </nav>
      <div className="hidden text-xs leading-5 text-slate-500 md:block">Prix Cardmarket · Visuels <a className="text-cyan-300/70 hover:text-cyan-200" href="https://www.tcgdex.net" target="_blank" rel="noreferrer">TCGdex</a><br />Telegram actif</div>
    </aside>
    <div className="min-w-0">{children}</div>
  </div>;
}
