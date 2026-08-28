"use client";
/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities, react-hooks/exhaustive-deps */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Snapshot = { date: string; probable: number; low: number | null; average: number | null };
type ItemData = {
  product: { id: string; cardmarketProductId: number; name: string; kind: string; setName?: string | null; imageUrl?: string | null };
  current: Snapshot | null;
  history: Snapshot[];
  favorite: boolean;
  owned: { id: string; binderId: string; binderName: string; quantity: number; purchasePrice: number | null }[];
  binders: { id: string; name: string }[];
  markets: { cardmarket: number | null; vintedActiveMedian: number | null; vintedCount: number; ebay: null };
  activeListings: { id: string; title: string; url: string; price: number; country?: string | null; condition?: string | null; imageUrl?: string | null; publishedAt: string }[];
};

export function ItemDetail({ id }: { id: string }) {
  const [data, setData] = useState<ItemData | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(true);
  const [binderId, setBinderId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [sellEntry, setSellEntry] = useState("");
  const [salePrice, setSalePrice] = useState("");

  async function refresh() {
    setBusy(true);
    const response = await fetch(`/api/items/${encodeURIComponent(id)}`, { cache: "no-store" });
    const body = await response.json();
    if (response.ok) {
      setData(body);
      setBinderId((value) => value || body.binders?.[0]?.id || "");
      setSellEntry((value) => value || body.owned?.[0]?.id || "");
    } else setMessage(body.error || "Article introuvable");
    setBusy(false);
  }

  useEffect(() => { void refresh(); }, [id]);
  const chart = useMemo(() => buildChart(data?.history ?? []), [data?.history]);

  async function toggleFavorite() {
    if (!data) return;
    const response = await fetch(data.favorite ? `/api/wishlist?externalId=${encodeURIComponent(`cardmarket:${data.product.id}`)}` : "/api/wishlist", data.favorite
      ? { method: "DELETE" }
      : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: data.product.id }) });
    if (response.ok) setData({ ...data, favorite: !data.favorite });
    else setMessage((await response.json()).error || "Connexion requise");
  }

  async function recordPurchase() {
    if (!data || !binderId || purchasePrice === "") return setMessage("Choisis un classeur et indique le prix d'achat.");
    const response = await fetch("/api/collection-purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ binderId, productId: data.product.id, quantity, unitPurchasePrice: Number(purchasePrice) }) });
    const body = await response.json();
    setMessage(response.ok ? "Achat ajouté au portefeuille." : body.error || "Ajout impossible");
    if (response.ok) { setPurchasePrice(""); await refresh(); }
  }

  async function recordSale() {
    if (!sellEntry || salePrice === "") return setMessage("Choisis une position et indique le prix de vente.");
    const response = await fetch("/api/collection-sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryId: sellEntry, quantity, unitSalePrice: Number(salePrice), fees: 0 }) });
    const body = await response.json();
    setMessage(response.ok ? "Vente enregistrée et P&L recalculé." : body.error || "Vente impossible");
    if (response.ok) { setSalePrice(""); await refresh(); }
  }

  if (busy && !data) return <main className="app-page"><div className="loading-panel">Chargement de la cotation…</div></main>;
  if (!data) return <main className="app-page"><div className="neu-card p-8">{message}</div></main>;
  const current = data.current?.probable ?? data.markets.cardmarket;

  return <main className="app-page item-detail-page">
    <Link href="/items" className="neu-button inline-flex">← Retour aux prix</Link>
    <section className="item-detail-hero mt-5">
      <div className="item-detail-image">{data.product.imageUrl ? <img src={data.product.imageUrl} alt={data.product.name} /> : <div className="image-placeholder">PK</div>}</div>
      <div className="min-w-0 flex-1"><p className="eyebrow">{data.product.kind.replaceAll("_", " ")} · {data.product.setName || "Catalogue Cardmarket"}</p><h1>{data.product.name}</h1><p className="item-live-price">{current === null ? "Prix indisponible" : euro(current)}</p><div className="mt-5 flex flex-wrap gap-3"><button className={`neu-button ${data.favorite ? "active" : ""}`} onClick={() => void toggleFavorite()}>{data.favorite ? "★ Dans ma wishlist" : "☆ Ajouter à ma wishlist"}</button><a className="button-primary" href={`https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=${encodeURIComponent(data.product.name)}`} target="_blank" rel="noreferrer">Voir sur Cardmarket ↗</a></div></div>
    </section>
    {message && <p className="status-message">{message}</p>}

    <section className="detail-grid mt-6">
      <article className="neu-card chart-card"><div className="section-heading"><div><p className="eyebrow">Historique Cardmarket</p><h2>Évolution du prix</h2></div><strong>{current === null ? "—" : euro(current)}</strong></div>{chart ? <svg viewBox="0 0 800 260" role="img" aria-label="Courbe historique du prix" className="price-chart"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#12d7bb" stopOpacity=".38"/><stop offset="1" stopColor="#12d7bb" stopOpacity="0"/></linearGradient></defs><path d={`${chart.path} L 790 250 L 10 250 Z`} fill="url(#chartFill)"/><path d={chart.path} fill="none" stroke="#12d7bb" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg> : <div className="empty-chart">L'historique apparaîtra après plusieurs imports quotidiens.</div>}<div className="chart-range"><span>{chart?.minDate || "—"}</span><span>{chart?.maxDate || "Aujourd'hui"}</span></div></article>
      <article className="neu-card p-5"><p className="eyebrow">Comparer les marchés</p><h2 className="mt-2 text-xl font-bold">Prix disponibles</h2><div className="market-list"><Market name="Cardmarket" value={data.markets.cardmarket} count="Price Guide" href={`https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=${encodeURIComponent(data.product.name)}`} /><Market name="Vinted" value={data.markets.vintedActiveMedian} count={`${data.markets.vintedCount} annonce(s) active(s)`} href={`https://www.vinted.fr/catalog?search_text=${encodeURIComponent(data.product.name)}`} /><Market name="eBay" value={null} count="Lien de comparaison" href={`https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(data.product.name)}`} /></div><p className="helper-text">Cardmarket reste la cotation principale. Vinted affiche ici la médiane des annonces actives, pas des ventes réalisées.</p></article>
    </section>

    <section className="detail-grid mt-6">
      <article className="neu-card p-5"><p className="eyebrow">Portefeuille</p><h2 className="mt-2 text-xl font-bold">Ajouter un achat</h2>{data.binders.length ? <div className="transaction-form"><select className="neu-input" value={binderId} onChange={(e)=>setBinderId(e.target.value)}>{data.binders.map((binder)=><option key={binder.id} value={binder.id}>{binder.name}</option>)}</select><input className="neu-input" type="number" min="1" value={quantity} onChange={(e)=>setQuantity(Math.max(1, Number(e.target.value)))} aria-label="Quantité"/><input className="neu-input" type="number" min="0" step="0.01" value={purchasePrice} onChange={(e)=>setPurchasePrice(e.target.value)} placeholder="Prix unitaire €"/><button className="button-primary" onClick={() => void recordPurchase()}>+ Ajouter</button></div> : <p className="helper-text">Crée d'abord un classeur dans Collection.</p>}</article>
      <article className="neu-card p-5"><p className="eyebrow">Vente</p><h2 className="mt-2 text-xl font-bold">Enregistrer une sortie</h2>{data.owned.length ? <div className="transaction-form"><select className="neu-input" value={sellEntry} onChange={(e)=>setSellEntry(e.target.value)}>{data.owned.map((entry)=><option key={entry.id} value={entry.id}>{entry.binderName} · {entry.quantity} disponible(s)</option>)}</select><input className="neu-input" type="number" min="1" value={quantity} onChange={(e)=>setQuantity(Math.max(1, Number(e.target.value)))} aria-label="Quantité vendue"/><input className="neu-input" type="number" min="0" step="0.01" value={salePrice} onChange={(e)=>setSalePrice(e.target.value)} placeholder="Prix de vente unitaire €"/><button className="button-primary" onClick={() => void recordSale()}>Enregistrer la vente</button></div> : <p className="helper-text">Aucune quantité possédée pour cet article.</p>}</article>
    </section>

    <section className="mt-8"><div className="section-heading"><div><p className="eyebrow">Marché en direct</p><h2>Annonces Vinted associées</h2></div><span>{data.activeListings.length} résultat(s)</span></div><div className="listing-strip mt-4">{data.activeListings.map((listing)=><a key={listing.id} href={listing.url} target="_blank" rel="noreferrer" className="neu-card listing-mini">{listing.imageUrl ? <img src={listing.imageUrl} alt="" loading="lazy"/> : <div className="image-placeholder">V</div>}<div><strong>{listing.title}</strong><span>{euro(listing.price)}</span><small>{listing.country || "Pays inconnu"} · {listing.condition || "État non renseigné"}</small></div></a>)}{!data.activeListings.length && <div className="neu-card p-6 text-slate-400">Aucune annonce active correctement associée pour le moment.</div>}</div></section>
  </main>;
}

function Market({ name, value, count, href }: { name: string; value: number | null; count: string; href: string }) { return <a href={href} target="_blank" rel="noreferrer" className="market-row"><div><strong>{name}</strong><small>{count}</small></div><span>{value === null ? "Comparer ↗" : euro(value)}</span></a>; }
function euro(value: number) { return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value); }
function buildChart(rows: Snapshot[]) {
  const valid = rows.filter((row) => Number.isFinite(row.probable) && row.probable > 0);
  if (valid.length < 2) return null;
  const sampled = valid.length > 120 ? valid.filter((_, index) => index % Math.ceil(valid.length / 120) === 0 || index === valid.length - 1) : valid;
  const values = sampled.map((row) => row.probable); const min = Math.min(...values); const max = Math.max(...values); const span = Math.max(0.01, max - min);
  const path = sampled.map((row, index) => `${index ? "L" : "M"} ${10 + (index / Math.max(1, sampled.length - 1)) * 780} ${240 - ((row.probable - min) / span) * 220}`).join(" ");
  return { path, minDate: new Date(sampled[0]!.date).toLocaleDateString("fr-FR"), maxDate: new Date(sampled.at(-1)!.date).toLocaleDateString("fr-FR") };
}
