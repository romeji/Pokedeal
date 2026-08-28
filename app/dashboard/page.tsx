/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities */
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/database/prisma";

export const dynamic = "force-dynamic";
const officialNews = [
  { title: "Méga-Rayquaza-ex débarque dans le JCC Pokémon", date: "20 août 2026", href: "https://www.pokemon.com/fr/actus-pokemon" },
  { title: "Des cartes Pikachu électrisantes pour le 30ᵉ anniversaire", date: "18 août 2026", href: "https://www.pokemon.com/fr/actualites/des-cartes-pikachu-electrisantes-dans-lextension-30-anniversaire-du-jcc-pokemon" },
  { title: "Tous les produits JCC Pokémon du 30ᵉ anniversaire", date: "30 juin 2026", href: "https://www.pokemon.com/fr/actualites/jcc-pokemon-produits-30-anniversaire" },
];

export default async function DashboardPage() {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  const startMonth = new Date(); startMonth.setDate(1); startMonth.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  const [catalogProducts, priceCount, listingCount, opportunities, entries, monthSales, monthDeals] = await Promise.all([
    prisma.cardmarketProduct.count().catch(() => 0),
    prisma.priceSnapshot.count().catch(() => 0),
    prisma.listing.count().catch(() => 0),
    prisma.opportunity.findMany({ where: { estimatedProfit: { gt: 0 }, listing: { status: { in: ["NEW","ANALYZED","MATCHED","SCORED"] } } }, include: { listing: { include: { images: { take: 1 } } }, score: true }, orderBy: [{ score: { score: "desc" } }, { updatedAt: "desc" }], take: 6 }).catch(() => []),
    userId ? prisma.collectionEntry.findMany({ where: { quantity: { gt: 0 }, binder: { userId } }, include: { binder: { select: { name: true } }, product: { include: { priceSnapshots: { orderBy: { retrievedAt: "desc" }, take: 40 } } } } }).catch(() => []) : Promise.resolve([]),
    userId ? prisma.collectionSale.findMany({ where: { userId, soldAt: { gte: startMonth } } }).catch(() => []) : Promise.resolve([]),
    userId ? prisma.opportunityDecision.count({ where: { userId, status: { in: ["VALIDATED","BOUGHT"] }, updatedAt: { gte: startMonth } } }).catch(() => 0) : Promise.resolve(0),
  ]);
  const positions = entries.map((entry) => {
    const latest = entry.product?.priceSnapshots[0];
    const previous = entry.product?.priceSnapshots.find((snapshot) => snapshot.retrievedAt < today);
    const currentUnit = entry.manualValue === null ? priceOf(latest) : Number(entry.manualValue);
    const previousUnit = entry.manualValue === null ? priceOf(previous ?? latest) : Number(entry.manualValue);
    return { id: entry.id, productId: entry.productId, name: entry.name, imageUrl: entry.imageUrl ?? entry.product?.imageUrl, binder: entry.binder.name, quantity: entry.quantity, value: currentUnit * entry.quantity, change: previousUnit > 0 ? ((currentUnit - previousUnit) / previousUnit) * 100 : 0 };
  });
  const totalValue = positions.reduce((sum,row)=>sum+row.value,0);
  const previousValue = positions.reduce((sum,row)=>sum+(row.change ? row.value/(1+row.change/100) : row.value),0);
  const dailyChange = previousValue > 0 ? ((totalValue-previousValue)/previousValue)*100 : 0;
  const invested = entries.reduce((sum,entry)=>sum+Number(entry.purchasePrice ?? 0)*entry.quantity,0);
  const unrealized = totalValue-invested;
  const salesPnl = monthSales.reduce((sum,sale)=>sum+(Number(sale.unitSalePrice)*sale.quantity-Number(sale.fees)-Number(sale.unitCostBasis ?? 0)*sale.quantity),0);
  const gainers = positions.filter((row)=>row.change!==0).sort((a,b)=>b.change-a.change).slice(0,6);

  return <main className="app-page dashboard-page"><header className="dashboard-welcome"><div><p className="eyebrow">Intelligence marché</p><h1>Bonjour {session?.user?.name?.split(" ")[0] || "collectionneur"}</h1><p>Ton portefeuille et les meilleures opportunités du marché en un coup d'œil.</p></div><Link className="button-primary" href="/items">+ Ajouter un article</Link></header>
    <section className="portfolio-hero mt-6"><div><p>Valeur totale du portefeuille</p><strong>{euro(totalValue)}</strong><span className={dailyChange>=0?"gain-badge":"loss-badge"}>{dailyChange>=0?"↗":"↘"} {signed(dailyChange)} aujourd'hui</span></div><div className="portfolio-spark"><svg viewBox="0 0 600 170" preserveAspectRatio="none"><defs><linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#12d7bb" stopOpacity=".35"/><stop offset="1" stopColor="#12d7bb" stopOpacity="0"/></linearGradient></defs><path d="M0 145 C45 135 50 125 86 122 S120 92 155 96 S190 58 230 64 S270 34 315 40 S365 23 410 28 S480 15 600 17 L600 170 L0 170Z" fill="url(#portfolioFill)"/><path d="M0 145 C45 135 50 125 86 122 S120 92 155 96 S190 58 230 64 S270 34 315 40 S365 23 410 28 S480 15 600 17" fill="none" stroke="#12d7bb" strokeWidth="4"/></svg></div><div className="portfolio-summary"><span>Investi<strong>{euro(invested)}</strong></span><span>Gain latent<strong className={unrealized>=0?"gain":"loss"}>{euro(unrealized)}</strong></span><span>Positions<strong>{positions.reduce((sum,row)=>sum+row.quantity,0)}</strong></span></div></section>
    {!userId&&<section className="neu-card mt-5 flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-bold">Connecte-toi pour activer ton portefeuille</h2><p className="mt-1 text-sm text-slate-400">Tes classeurs, achats, ventes, favoris et traitements de deals seront alors isolés dans ton compte.</p></div><Link className="button-primary" href="/profile">Connexion Google</Link></section>}
    <section className="dashboard-metrics mt-5"><article className="neu-card"><span>P&L réalisé ce mois</span><strong className={salesPnl>=0?"gain":"loss"}>{euro(salesPnl)}</strong><small>{monthSales.length} vente(s)</small></article><article className="neu-card"><span>Bonnes affaires traitées</span><strong>{monthDeals}</strong><small>ce mois</small></article><article className="neu-card"><span>Scanner Vinted</span><strong>{listingCount}</strong><small>annonces collectées</small></article><article className="neu-card"><span>Oracle Cardmarket</span><strong>{catalogProducts}</strong><small>{priceCount} cotations historiques</small></article></section>
    <section className="dashboard-columns mt-7"><div><div className="section-heading"><div><p className="eyebrow">Marché</p><h2>Plus fortes variations</h2></div><Link href="/collection">Ma collection →</Link></div><div className="gainer-list mt-3">{gainers.map((row)=><Link href={row.productId?`/items/${row.productId}`:"/collection"} key={row.id} className="neu-card gainer-row">{row.imageUrl?<img src={row.imageUrl} alt=""/>:<div className="image-placeholder">PK</div>}<div><strong>{row.name}</strong><small>{row.binder} · x{row.quantity}</small></div><span>{euro(row.value)}<b className={row.change>=0?"gain":"loss"}>{signed(row.change)}</b></span></Link>)}{!gainers.length&&<div className="neu-card p-6 text-sm text-slate-400">Les variations apparaîtront après deux imports Cardmarket effectués sur des jours différents.</div>}</div></div>
      <div><div className="section-heading"><div><p className="eyebrow">Top deals</p><h2>Opportunités actives</h2></div><Link href="/library">Tout voir →</Link></div><div className="dashboard-deals mt-3">{opportunities.slice(0,4).map((row)=><a href={row.listing.url} target="_blank" rel="noreferrer" key={row.id} className="neu-card dashboard-deal">{row.listing.images[0]?.url?<img src={row.listing.images[0].url} alt=""/>:<div className="image-placeholder">V</div>}<div><strong>{row.listing.title}</strong><small>{euro(row.purchasePrice)} · profit <b>+{euro(row.estimatedProfit)}</b></small></div><span>{row.score?.score??"—"}</span></a>)}{!opportunities.length&&<div className="neu-card p-6 text-sm text-slate-400">Aucun deal fiable n'est actuellement publié. Les anciens faux positifs ont été retirés.</div>}</div></div></section>
    <section className="mt-8"><div className="section-heading"><div><p className="eyebrow">Actualités officielles en français</p><h2>Le radar Pokémon</h2></div><a href="https://www.pokemon.com/fr/actus-pokemon" target="_blank" rel="noreferrer">Pokemon.fr ↗</a></div><div className="news-carousel mt-3">{officialNews.map((news)=><a className="neu-card news-card" href={news.href} target="_blank" rel="noreferrer" key={news.title}><span>JCC POKÉMON</span><h3>{news.title}</h3><small>{news.date} · Source officielle ↗</small></a>)}</div></section>
  </main>;
}

function priceOf(snapshot: { trendPrice: unknown; avg7Price: unknown; averagePrice: unknown; lowPrice: unknown } | undefined) { return Number(snapshot?.trendPrice ?? snapshot?.avg7Price ?? snapshot?.averagePrice ?? snapshot?.lowPrice ?? 0); }
const euro=(value:unknown)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(Number(value??0));
const signed=(value:number)=>`${value>=0?"+":""}${value.toFixed(2)} %`;
