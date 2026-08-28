/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { CardFavoriteButton } from "@/components/collection/CardFavoriteButton";
import { prisma } from "@/lib/database/prisma";
import { assetImage, assetLogo, getCard } from "@/lib/tcgdex/client";

export const dynamic = "force-dynamic";

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [card, session] = await Promise.all([getCard(id, "fr").catch(() => null), auth().catch(() => null)]);
  if (!card) notFound();
  const userId = session?.user?.id;
  const marketId = card.pricing?.cardmarket?.idProduct;
  const product = marketId ? await prisma.cardmarketProduct.findUnique({ where: { cardmarketProductId: marketId }, include: { priceSnapshots: { orderBy: { retrievedAt: "asc" }, take: 365 } } }) : null;
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

  return <main className="app-page maquette-page item-detail-page">
    <header className="maquette-topbar"><div><span>{card.set.name}</span><h1>Fiche carte</h1></div><Link href="/collection/blocks" className="circle-action" aria-label="Retour">←</Link></header>
    <section className="item-identity neu-card pokemon-detail-hero">
      <div className="item-detail-image">{imageUrl ? <img src={imageUrl} alt={card.name} /> : <div className="image-placeholder">◇</div>}</div>
      <div className="item-detail-copy">{card.set.logo && <img src={assetLogo(card.set.logo) ?? ""} alt={card.set.name} className="card-set-logo" />}<span className="catalog-code">{card.rarity || card.category || "Carte Pokémon"} · #{card.localId}</span><h1>{card.name}</h1><p>{card.set.name} · {card.variants ? Object.keys(card.variants).filter((key) => card.variants?.[key]).join(" · ") : "Version standard"}</p><strong className="item-current-price">{current > 0 ? euro(current) : "Cours indisponible"}</strong><div className="item-actions"><CardFavoriteButton cardId={id} initialFavorite={Boolean(favorite)} authenticated={Boolean(userId)} /><Link href={`/collection/blocks?set=${encodeURIComponent(card.set.id)}&card=${encodeURIComponent(id)}`} className="button-primary">＋ Ajouter à ma collection</Link></div></div>
    </section>
    <section className="item-detail-grid">
      <article className="neu-card"><p className="eyebrow">Ma position</p><div className="detail-metrics"><div><span>Quantité</span><strong>{quantity}</strong></div><div><span>Investi</span><strong>{euro(invested)}</strong></div><div><span>Valeur</span><strong>{euro(marketValue)}</strong></div><div><span>Plus-value latente</span><strong className={unrealized !== null && unrealized < 0 ? "text-rose-300" : "text-emerald-300"}>{unrealized === null ? "Prix d’achat requis" : signedEuro(unrealized)}</strong></div><div><span>P&amp;L réalisé</span><strong>{signedEuro(realized)}</strong></div></div>{entries.length > 0 && <div className="mt-5 space-y-2">{entries.map((entry) => <Link key={entry.id} href={`/portfolio/${entry.binder.id}`} className="binder-row"><span>{entry.binder.name}</span><strong>{entry.quantity} ex.</strong></Link>)}</div>}</article>
      <article className="neu-card"><p className="eyebrow">Cotation Cardmarket</p><div className="detail-metrics"><div><span>Tendance</span><strong>{euro(current)}</strong></div><div><span>Moyenne</span><strong>{euro(Number(card.pricing?.cardmarket?.avg ?? 0))}</strong></div><div><span>Prix bas</span><strong>{euro(Number(card.pricing?.cardmarket?.low ?? 0))}</strong></div></div><p className="deal-price-warning mt-5">Prix indicatifs du guide Cardmarket. La langue, l’état, la variante et la gradation peuvent modifier fortement la valeur réelle.</p></article>
    </section>
  </main>;
}

const euro = (value: number) => value > 0 ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value) : "—";
const signedEuro = (value: number) => `${value >= 0 ? "+" : ""}${new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value)}`;
