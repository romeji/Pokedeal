/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { CardFavoriteButton } from "@/components/collection/CardFavoriteButton";
import { prisma } from "@/lib/database/prisma";
import { getEbayActiveMarket } from "@/lib/ebay/market";
import { assetImage, assetLogo, getCard } from "@/lib/tcgdex/client";

export const dynamic = "force-dynamic";

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [card, session] = await Promise.all([getCard(id, "fr").catch(() => null), auth().catch(() => null)]);
  if (!card) notFound();
  const userId = session?.user?.id;
  const marketId = card.pricing?.cardmarket?.idProduct;
  const product = marketId ? await prisma.cardmarketProduct.findUnique({ where: { cardmarketProductId: marketId }, include: { priceSnapshots: { orderBy: { retrievedAt: "asc" }, take: 365 }, productMatches: { where: { listing: { status: { notIn: ["SOLD", "REMOVED", "EXPIRED"] } } }, include: { listing: { select: { price: true } } }, take: 50 } } }) : null;
  const [entries, favorite, sales] = userId ? await Promise.all([
    prisma.collectionEntry.findMany({ where: { externalId: id, quantity: { gt: 0 }, binder: { userId } }, include: { binder: { select: { id: true, name: true } } } }),
    prisma.watchlist.findFirst({ where: { userId, externalId: id }, select: { id: true } }),
    prisma.collectionSale.findMany({ where: { userId, externalId: id }, orderBy: { soldAt: "desc" } }),
  ]) : [[], null, []];
  const current = Number(product?.priceSnapshots.at(-1)?.trendPrice ?? product?.priceSnapshots.at(-1)?.avg7Price ?? card.pricing?.cardmarket?.trend ?? card.pricing?.cardmarket?.avg ?? card.pricing?.cardmarket?.low ?? 0);
  const quantity = entries.reduce((sum, entry) => sum + entry.quantity, 0);
  const invested = entries.reduce((sum, entry) => sum + Number(entry.purchasePrice ?? 0) * entry.quantity, 0);
  const marketValue = current * quantity;
  const unrealized = invested > 0 ? marketValue - invested : null;
  const realized = sales.reduce((sum, sale) => sum + Number(sale.unitSalePrice) * sale.quantity - Number(sale.fees) - Number(sale.unitCostBasis ?? 0) * sale.quantity, 0);
  const imageUrl = assetImage(card.image);
  const vintedPrices = product?.productMatches.map((match) => Number(match.listing.price)).filter((price) => price > 0).sort((a, b) => a - b) ?? [];
  const vintedMedian = vintedPrices.length ? vintedPrices[Math.floor(vintedPrices.length / 2)]! : null;
  const ebay = await getEbayActiveMarket(`${card.name} ${card.set.name}`).catch(() => ({ configured: false, median: null, count: 0, url: null }));
  const chart = buildChart(product?.priceSnapshots.map((snapshot) => ({ date: snapshot.retrievedAt, price: Number(snapshot.trendPrice ?? snapshot.avg7Price ?? snapshot.averagePrice ?? snapshot.lowPrice ?? 0) })) ?? []);

  return <main className="app-page maquette-page item-detail-page">
    <header className="maquette-topbar"><div><span>{card.set.name}</span><h1>Fiche carte</h1></div><Link href="/collection/blocks" className="circle-action" aria-label="Retour">←</Link></header>
    <section className="item-identity neu-card pokemon-detail-hero product-focus">
      <div className="item-detail-image">{imageUrl ? <img src={imageUrl} alt={card.name} /> : <div className="pokemon-logo-placeholder"><img src="/icon.svg" alt="PokéDeal" /><span>POKÉMON</span></div>}</div>
      <div className="item-detail-copy">{card.set.logo && <img src={assetLogo(card.set.logo) ?? ""} alt={card.set.name} className="card-set-logo" />}<span className="catalog-code">{card.rarity || card.category || "Carte Pokémon"} · #{card.localId}</span><h1>{card.name}</h1><p>{card.set.name} · {card.variants ? Object.keys(card.variants).filter((key) => card.variants?.[key]).join(" · ") : "Version standard"}</p><strong className="item-current-price">{current > 0 ? euro(current) : "Cours indisponible"}</strong><div className="item-actions"><CardFavoriteButton cardId={id} initialFavorite={Boolean(favorite)} authenticated={Boolean(userId)} /><Link href={`/collection/blocks?set=${encodeURIComponent(card.set.id)}&card=${encodeURIComponent(id)}`} className="button-primary">＋ Ajouter à ma collection</Link></div></div>
    </section>
    {quantity > 0 && <section className="neu-card owned-position"><div><p className="eyebrow">Ma position</p><h2>{quantity} exemplaire{quantity > 1 ? "s" : ""}</h2></div><div><span>Investi</span><strong>{euro(invested)}</strong></div><div><span>Valeur actuelle</span><strong>{euro(marketValue)}</strong></div><div><span>Plus-value latente</span><strong className={unrealized !== null && unrealized < 0 ? "loss" : "gain"}>{unrealized === null ? "Prix d’achat requis" : signedEuro(unrealized)}</strong></div><div><span>P&amp;L réalisé</span><strong>{signedEuro(realized)}</strong></div>{entries.map((entry) => <Link key={entry.id} href={`/portfolio/${entry.binder.id}`} className="neu-button">{entry.binder.name} · {entry.quantity} ex.</Link>)}</section>}
    <section className="item-detail-grid">
      <article className="neu-card chart-card"><div className="section-heading"><div><p className="eyebrow">Historique Cardmarket</p><h2>Évolution du prix</h2></div><strong>{euro(current)}</strong></div>{chart ? <svg viewBox="0 0 800 260" className="price-chart" role="img" aria-label="Évolution du prix"><path d={`${chart.path} L 790 250 L 10 250 Z`} fill="rgba(91,141,239,.14)"/><path d={chart.path} fill="none" stroke="#5b8def" strokeWidth="5" strokeLinecap="round"/></svg> : <div className="empty-chart">L’historique apparaîtra après plusieurs imports quotidiens.</div>}<div className="chart-range"><span>{chart?.minDate ?? "—"}</span><span>{chart?.maxDate ?? "Aujourd’hui"}</span></div></article>
      <article className="neu-card"><p className="eyebrow">Cotation Cardmarket</p><div className="detail-metrics"><div><span>Tendance</span><strong>{euro(current)}</strong></div><div><span>Moyenne</span><strong>{euro(Number(card.pricing?.cardmarket?.avg ?? 0))}</strong></div><div><span>Prix bas</span><strong>{euro(Number(card.pricing?.cardmarket?.low ?? 0))}</strong></div></div><p className="deal-price-warning mt-5">Prix indicatifs du guide Cardmarket. La langue, l’état, la variante et la gradation peuvent modifier fortement la valeur réelle.</p></article>
    </section>
    <section className="neu-card market-comparison-card"><p className="eyebrow">Comparer les marchés</p><div className="market-list"><Market name="Cardmarket" value={current} detail="Price Guide" href={`https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=${encodeURIComponent(`${card.name} ${card.set.name}`)}`} /><Market name="Vinted" value={vintedMedian} detail={`${vintedPrices.length} annonce(s) active(s)`} href={`https://www.vinted.fr/catalog?search_text=${encodeURIComponent(`${card.name} ${card.set.name}`)}`} /><Market name="eBay" value={ebay.median} detail={ebay.configured ? `${ebay.count} annonce(s) active(s)` : "Clés eBay à configurer"} href={ebay.url || `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(`${card.name} ${card.set.name}`)}`} /></div></section>
  </main>;
}

const euro = (value: number) => value > 0 ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value) : "—";
const signedEuro = (value: number) => `${value >= 0 ? "+" : ""}${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value)}`;
function Market({ name, value, detail, href }: { name: string; value: number | null; detail: string; href: string }) { return <a className="market-row" href={href} target="_blank" rel="noreferrer"><div><strong>{name}</strong><small>{detail}</small></div><span>{value === null ? "Comparer ↗" : euro(value)}</span></a>; }
function buildChart(rows: Array<{ date: Date; price: number }>) {
  const valid = rows.filter((row) => Number.isFinite(row.price) && row.price > 0);
  if (valid.length < 2) return null;
  const min = Math.min(...valid.map((row) => row.price)); const max = Math.max(...valid.map((row) => row.price)); const span = Math.max(.01, max - min);
  const path = valid.map((row, index) => `${index ? "L" : "M"} ${10 + index / Math.max(1, valid.length - 1) * 780} ${240 - (row.price - min) / span * 220}`).join(" ");
  return { path, minDate: valid[0]!.date.toLocaleDateString("fr-FR"), maxDate: valid.at(-1)!.date.toLocaleDateString("fr-FR") };
}
