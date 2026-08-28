/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getTopGainers } from "@/lib/pricing/gainers";

export const dynamic = "force-dynamic";

export default async function GainersPage() {
  const rows = await getTopGainers(50, 7).catch(() => []);
  return <main className="app-page maquette-page"><header className="maquette-topbar"><div><span>Marché Pokémon · 7 jours</span><h1>Les 50 plus fortes hausses</h1></div><Link href="/dashboard" className="circle-action">←</Link></header><p className="price-intro">Évolution calculée uniquement avec les imports réels du Price Guide Cardmarket. Les variations sans historique suffisant sont exclues.</p><section className="gainers-full-grid">{rows.map((row, index) => <Link href={`/items/${row.id}`} className="gainer-full-card neu-card" key={row.id}><span className="gainer-rank">#{index + 1}</span>{row.imageUrl ? <img src={row.imageUrl} alt={row.name} /> : <div className="pokemon-logo-placeholder"><img src="/icon.svg" alt="PokéDeal" /><span>POKÉMON</span></div>}<div><span className="catalog-code">{row.kind.replaceAll("_", " ")}</span><h2>{row.name}</h2><small>{euro(row.oldPrice)} → {euro(row.currentPrice)}</small></div><strong>+{row.changePercent.toFixed(1)}%</strong></Link>)}{!rows.length && <div className="loading-panel">Il faut au moins deux imports de prix espacés pour calculer les hausses.</div>}</section></main>;
}

const euro = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
