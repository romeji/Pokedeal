import Link from "next/link";
export function AppShell({ children }:{ children:React.ReactNode }) {
  return <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
    <aside className="glass-panel m-3 flex items-center justify-between rounded-3xl px-5 py-4 md:sticky md:top-3 md:h-[calc(100vh-24px)] md:flex-col md:items-stretch">
      <Link href="/dashboard" className="font-display text-lg font-bold tracking-tight"><span className="text-cyan-300">POKÉ</span>DEAL</Link>
      <nav className="flex gap-2 text-sm md:flex-col">
        <Link className="nav-link" href="/dashboard">Vue d’ensemble</Link>
        <Link className="nav-link" href="/library">Bibliothèque</Link>
        <Link className="nav-link" href="/admin/imports">Configuration</Link>
        <Link className="nav-link hidden md:block" href="/admin/monitors">Temps réel</Link>
        <Link className="nav-link hidden md:block" href="/admin/filters">Filtres</Link>
        <Link className="nav-link hidden md:block" href="/admin/system">Système</Link>
      </nav>
      <div className="hidden text-xs text-slate-500 md:block">Cardmarket local · Telegram actif</div>
    </aside>
    <div className="min-w-0">{children}</div>
  </div>;
}
