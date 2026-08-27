import { ScoreBadge } from "@/components/dashboard/ScoreBadge";

// Données de démonstration Phase 1 — remplacées par Prisma dès la Phase 3/5.
const kpis = [
  { label: "Opportunités aujourd'hui", value: "0", icon: "🔥" },
  { label: "Profit potentiel", value: "0 €", icon: "💰" },
  { label: "Gros deals", value: "0", icon: "🚨" },
  { label: "Annonces analysées", value: "0", icon: "📊" },
  { label: "Produits surveillés", value: "0", icon: "📈" },
];

const mockRows = [
  {
    product: "Pokémon 151 ETB FR",
    price: 55,
    market: 100,
    discount: -45,
    profit: 30,
    roi: 50,
    score: 91,
    risk: "Faible",
    confidence: 96,
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen px-6 py-8 md:px-10">
      <header className="mb-8 flex items-center justify-between border-b border-base-700 pb-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-market-accent">
            scan actif · vinted → cardmarket
          </p>
          <h1 className="font-display text-2xl font-semibold text-slate-50 md:text-3xl">
            Pokémon Deal Scanner
          </h1>
        </div>
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-market-profit opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-market-profit" />
        </span>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-card border border-base-700 bg-base-900 p-4"
          >
            <div className="mb-2 text-lg">{kpi.icon}</div>
            <div className="font-mono text-xl font-semibold text-slate-50">{kpi.value}</div>
            <div className="text-xs text-slate-400">{kpi.label}</div>
          </div>
        ))}
      </section>

      <section className="rounded-card border border-base-700 bg-base-900">
        <div className="flex items-center justify-between border-b border-base-700 px-5 py-4">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-slate-300">
            Opportunités récentes
          </h2>
          <p className="text-xs text-slate-500">
            Données de démonstration — brancher Prisma en Phase 3/5
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-base-700 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Produit</th>
                <th className="px-5 py-3">Prix</th>
                <th className="px-5 py-3">Marché</th>
                <th className="px-5 py-3">Décote</th>
                <th className="px-5 py-3">Profit</th>
                <th className="px-5 py-3">ROI</th>
                <th className="px-5 py-3">Score</th>
                <th className="px-5 py-3">Risque</th>
                <th className="px-5 py-3">Confiance</th>
              </tr>
            </thead>
            <tbody>
              {mockRows.map((row) => (
                <tr key={row.product} className="border-b border-base-800 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-100">{row.product}</td>
                  <td className="px-5 py-3 font-mono">{row.price} €</td>
                  <td className="px-5 py-3 font-mono">{row.market} €</td>
                  <td className="px-5 py-3 font-mono text-market-profit">{row.discount}%</td>
                  <td className="px-5 py-3 font-mono text-market-profit">+{row.profit} €</td>
                  <td className="px-5 py-3 font-mono">{row.roi}%</td>
                  <td className="px-5 py-3">
                    <ScoreBadge score={row.score} />
                  </td>
                  <td className="px-5 py-3 text-slate-400">{row.risk}</td>
                  <td className="px-5 py-3 text-slate-400">{row.confidence}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
