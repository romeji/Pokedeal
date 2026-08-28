/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities */
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/database/prisma";
import { getTopGainers } from "@/lib/pricing/gainers";

export const dynamic = "force-dynamic";
const officialNews = [
  { title: "Méga-Rayquaza-ex débarque dans le JCC Pokémon", date: "20 août 2026", href: "https://www.pokemon.com/fr/actus-pokemon" },
  { title: "Des cartes Pikachu électrisantes pour le 30ᵉ anniversaire", date: "18 août 2026", href: "https://www.pokemon.com/fr/actualites/des-cartes-pikachu-electrisantes-dans-lextension-30-anniversaire-du-jcc-pokemon" },
  { title: "Tous les produits JCC Pokémon du 30ᵉ anniversaire", date: "30 juin 2026", href: "https://www.pokemon.com/fr/actualites/jcc-pokemon-produits-30-anniversaire" },
];

export default async function DashboardPage() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [catalogProducts, priceCount, listingCount, gainers, entries, monthSales, monthDeals, watchlist] = await Promise.all([
    prisma.cardmarketProduct.count().catch(() => 0),
    prisma.priceSnapshot.count().catch(() => 0),
    prisma.listing.count().catch(() => 0),
    getTopGainers(5, 7).catch(() => []),
    userId ? prisma.collectionEntry.findMany({ where: { quantity: { gt: 0 }, binder: { userId } }, include: { product: { include: { priceSnapshots: { orderBy: { retrievedAt: "desc" }, take: 40 } } } } }).catch(() => []) : Promise.resolve([]),
    userId ? prisma.collectionSale.findMany({ where: { userId, soldAt: { gte: startMonth } } }).catch(() => []) : Promise.resolve([]),
    userId ? prisma.opportunityDecision.count({ where: { userId, status: { in: ["VALIDATED", "BOUGHT"] }, updatedAt: { gte: startMonth } } }).catch(() => 0) : Promise.resolve(0),
    userId ? prisma.watchlist.findMany({ where: { userId }, include: { product: { include: { priceSnapshots: { orderBy: { retrievedAt: "desc" }, take: 8 } } } }, orderBy: { createdAt: "desc" }, take: 8 }).catch(() => []) : Promise.resolve([]),
  ]);
  const positions = entries.map((entry) => {
    const latest = entry.product?.priceSnapshots[0];
    const previous = entry.product?.priceSnapshots.find((snapshot) => snapshot.retrievedAt < today);
    const currentUnit = entry.manualValue === null ? priceOf(latest) : Number(entry.manualValue);
    const previousUnit = entry.manualValue === null ? priceOf(previous ?? latest) : Number(entry.manualValue);
    return { value: currentUnit * entry.quantity, previousValue: previousUnit * entry.quantity };
  });
  const totalValue = positions.reduce((sum, row) => sum + row.value, 0);
  const previousValue = positions.reduce((sum, row) => sum + row.previousValue, 0);
  const dailyChange = previousValue > 0 ? ((totalValue - previousValue) / previousValue) * 100 : 0;
  const invested = entries.reduce((sum, entry) => sum + Number(entry.purchasePrice ?? 0) * entry.quantity, 0);
  const unrealized = totalValue - invested;
  const salesPnl = monthSales.reduce((sum, sale) => sum + Number(sale.unitSalePrice) * sale.quantity - Number(sale.fees) - Number(sale.unitCostBasis ?? 0) * sale.quantity, 0);

  return <main className="app-page dashboard-page maquette-page">
    <header className="maquette-topbar"><div><span>Bon retour</span><h1>{session?.user?.name?.split(" ")[0] || "Collectionneur"} 👋</h1></div><div className="topbar-actions"><Link href="/library" className="circle-action notification-action" aria-label="Notifications">🔔<i /></Link><Link href="/profile" className="avatar-btn">{session?.user?.name?.[0] || "P"}</Link></div></header>
    <section><div className="section-heading"><h2>Actualité Pokémon</h2></div><div className="news-carousel">{officialNews.map((news) => <a className="news-card" href={news.href} target="_blank" rel="noreferrer" key={news.title}><span>JCC POKÉMON</span><h3>{news.title}</h3><small>{news.date} · Source officielle ↗</small></a>)}</div></section>
    <section className="stat-row3"><article className="neu-card stat-card3"><span>Aujourd'hui</span><strong className={dailyChange >= 0 ? "gain" : "loss"}>{signed(dailyChange)}</strong><small>{euro(totalValue - previousValue)}</small><MiniSpark color={dailyChange >= 0 ? "#3ddc97" : "#ff6b7a"} /></article><article className="neu-card stat-card3"><span>Ce mois-ci</span><strong className={salesPnl >= 0 ? "gain" : "loss"}>{euro(salesPnl)}</strong><small>{monthSales.length} vente(s)</small><MiniSpark color="#3ddc97" /></article><article className="neu-card stat-card3"><span>Portefeuille</span><strong>{euro(totalValue)}</strong><small>{positions.length} position(s)</small><MiniSpark color="#5b8def" /></article></section>
    {!userId && <section className="neu-card login-strip"><div><h2>Active ton portefeuille</h2><p>Connecte-toi pour synchroniser classeurs, favoris et décisions.</p></div><Link className="button-primary" href="/profile">Connexion Google</Link></section>}
    <section><div className="section-heading"><h2>Plus fortes hausses</h2><Link href="/market/gainers">Voir les 50 →</Link></div><div className="home-deal-scroll">{gainers.map((row) => <Link href={`/items/${row.id}`} key={row.id} className="home-deal-card neu-card">{row.imageUrl ? <img src={row.imageUrl} alt={row.name} /> : <div className="pokemon-logo-placeholder"><img src="/icon.svg" alt="PokéDeal" /><span>POKÉMON</span></div>}<h3>{row.name}</h3><p>Cardmarket · 7 jours</p><div><strong>{euro(row.currentPrice)}</strong><span>+{row.changePercent.toFixed(1)}%</span></div></Link>)}{!gainers.length && <div className="neu-card empty-inline">Deux imports de prix sont nécessaires pour calculer les hausses.</div>}</div></section>
    <section><div className="section-heading"><h2>Suivi de mes favoris</h2><Link href="/collection/wishlist">Tout voir →</Link></div><div className="watch-scroll">{watchlist.map((row) => { const current = priceOf(row.product?.priceSnapshots[0]); const old = priceOf(row.product?.priceSnapshots.at(-1)); const change = old > 0 ? ((current - old) / old) * 100 : 0; return <Link href={row.productId ? `/items/${row.productId}` : "/collection/wishlist"} className="watch-card neu-card" key={row.id}><div><h3>{row.label}</h3><span>🔔</span></div><MiniSpark color={change >= 0 ? "#3ddc97" : "#ff6b7a"} /><strong>{euro(current)}</strong><small className={change >= 0 ? "gain" : "loss"}>{signed(change)} · 7 jours</small></Link>; })}{!watchlist.length && <Link href="/items" className="neu-card empty-inline">Ajoute un favori depuis la recherche de prix.</Link>}</div></section>
    <section className="system-strip"><span>{listingCount} annonces</span><span>{catalogProducts} produits</span><span>{priceCount} cotations</span><span>{monthDeals} deals traités</span><span>Investi {euro(invested)}</span><span className={unrealized >= 0 ? "gain" : "loss"}>Latent {euro(unrealized)}</span></section>
  </main>;
}

function MiniSpark({ color }: { color: string }) { return <svg className="mini-spark" viewBox="0 0 100 24"><polyline points="0,19 20,17 40,14 60,15 80,7 100,5" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" /></svg>; }
function priceOf(snapshot: { trendPrice: unknown; avg7Price: unknown; averagePrice: unknown; lowPrice: unknown } | undefined) { return Number(snapshot?.trendPrice ?? snapshot?.avg7Price ?? snapshot?.averagePrice ?? snapshot?.lowPrice ?? 0); }
const euro = (value: unknown) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(value ?? 0));
const signed = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(2)} %`;
