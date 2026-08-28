"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";

type Series = { id: string; name: string; logo: string | null; releaseDate: string | null; setCount: number };
type SetRow = { id: string; name: string; logo: string | null; releaseDate: string | null; total: number; owned: number; value: number };
type Card = { id: string; name: string; number: string; imageUrl: string | null; owned: boolean; wished: boolean };
type CollectionItem = { id: string; externalId: string; productId: string | null; kind: string; name: string; imageUrl: string | null; quantity: number; value: number; binderName: string };

export function BlocksExplorer() {
  const [series, setSeries] = useState<Series[]>([]);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [selectedSet, setSelectedSet] = useState<SetRow | null>(null);
  const [collectionItems, setCollectionItems] = useState<CollectionItem[]>([]);
  const [query, setQuery] = useState("");
  const [root, setRoot] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const requestedSet = new URLSearchParams(window.location.search).get("set");
    if (requestedSet) {
      setRoot(false); setBusy(true);
      fetch(`/api/collections/blocks?set=${encodeURIComponent(requestedSet)}`).then((response) => response.json()).then((data) => {
        const set = { ...data.set, owned: 0, value: 0 } as SetRow;
        setSelectedSet(set); setCards(data.cards ?? []);
      }).finally(() => setBusy(false));
    } else void loadSeries();
    fetch("/api/collections/entries").then((response) => response.json()).then((rows: CollectionItem[]) => setCollectionItems(Array.isArray(rows) ? rows : [])).catch(() => undefined);
  }, []);

  async function loadSeries() { setBusy(true); const response = await fetch("/api/collections/blocks"); const data = await response.json(); setSeries(data.series ?? []); setSelectedSeries(null); setSelectedSet(null); setBusy(false); }
  async function openSeries(item: Series) { setBusy(true); const response = await fetch(`/api/collections/blocks?series=${encodeURIComponent(item.id)}`); const data = await response.json(); setSelectedSeries(item); setSets(data.sets ?? []); setSelectedSet(null); setBusy(false); }
  async function openSet(item: SetRow) { setBusy(true); const response = await fetch(`/api/collections/blocks?set=${encodeURIComponent(item.id)}`); const data = await response.json(); setSelectedSet({ ...item, ...data.set }); setCards(data.cards ?? []); setBusy(false); }
  function goBack() {
    if (selectedSet) {
      setSelectedSet(null);
      setCards([]);
      return;
    }
    setSelectedSeries(null); setSets([]);
  }
  async function toggleWish(card: Card) {
    const response = await fetch(card.wished ? `/api/wishlist?externalId=${encodeURIComponent(card.id)}` : "/api/wishlist", card.wished ? { method: "DELETE" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ externalId: card.id }) });
    if (response.ok) setCards((current) => current.map((item) => item.id === card.id ? { ...item, wished: !item.wished } : item));
  }
  const filteredSeries = series.filter((item) => normalize(`${item.name} ${item.id}`).includes(normalize(query)));
  const filteredSets = sets.filter((item) => normalize(`${item.name} ${item.id} ${alias(item.id)}`).includes(normalize(query)));
  const filteredCards = cards.filter((item) => normalize(`${item.name} ${item.number}`).includes(normalize(query)));

  return <main className="app-page maquette-page collection-explorer"><header className="maquette-topbar"><div><span>Ma collection</span><h1>{selectedSet?.name ?? selectedSeries?.name ?? (root ? "Collection" : "Blocs")}</h1></div><div className="topbar-actions"><button className={`circle-action ${showSearch?"active":""}`} onClick={()=>setShowSearch((value)=>!value)} aria-label="Rechercher">⌕</button><Link href="/collection?create=1" className="circle-action" aria-label="Créer une collection">＋</Link></div></header>
    {!root&&<div className="collection-breadcrumb"><button onClick={goBack}>←</button><span>{selectedSet ? `${selectedSeries?.name} / ${selectedSet.name}` : selectedSeries?.name ?? "Blocs"}</span></div>}
    {showSearch&&<div className="collection-search"><input autoFocus className="neu-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher Fantasmagoriques, EV2, Pikachu…" /></div>}
    {message && <p className="status-message">{message}</p>}
    {busy ? <div className="loading-panel">Chargement du catalogue…</div> : root ? <><section className="block-grid"><button className="block-tile neu-card" onClick={()=>setRoot(false)}><span className="ico">▦</span><strong>Blocs</strong><small>{series.length} blocs</small></button><Link className="block-tile neu-card" href="/portfolio"><span className="ico">▤</span><strong>Classeurs</strong><small>Gérer mes collections</small></Link><Link className="block-tile neu-card" href="/collection/wishlist"><span className="ico">☆</span><strong>Souhaits</strong><small>Liste à surveiller</small></Link><Link className="block-tile neu-card" href="/items"><span className="ico">⌕</span><strong>Recherche de prix</strong><small>Cartes et items cotés</small></Link></section><section className="collection-owned-section"><div className="section-heading"><h2>Toute ma collection</h2><span>{collectionItems.reduce((sum, item) => sum + item.quantity, 0)} objet(s)</span></div><div className="collection-owned-grid">{collectionItems.map((item) => <Link key={item.id} href={item.kind === "CARD" ? `/cards/${item.externalId}` : item.productId ? `/items/${item.productId}` : "/portfolio"} className="catalog-card"><CatalogImage src={item.imageUrl} alt={item.name}/><span className="catalog-card-number">{item.binderName} · {item.quantity} ex.</span><h2>{item.name}</h2><strong>{euro(item.value)}</strong></Link>)}{!collectionItems.length && <Link href="/items" className="neu-card empty-inline">Ta collection est vide. Recherche une carte ou un item pour commencer.</Link>}</div></section></> : selectedSet ? <section className="card-catalog-grid">{filteredCards.map((card)=><article key={card.id} className={`catalog-card ${card.owned ? "owned" : ""}`}><Link className="catalog-card-main" href={`/cards/${card.id}`}><CatalogImage src={card.imageUrl} alt={card.name} /><span className="catalog-card-number">#{card.number}</span><h2>{card.name}</h2></Link><button className={`wish-button ${card.wished ? "active" : ""}`} onClick={() => void toggleWish(card)} aria-label={card.wished ? "Retirer de la liste de souhaits" : "Ajouter à la liste de souhaits"}>{card.wished ? "★" : "☆"}</button>{card.owned&&<span className="owned-badge">✓</span>}</article>)}</section> : selectedSeries ? <section className="set-grid">{filteredSets.map((set)=><button key={set.id} onClick={() => void openSet(set)} className="set-card neu-card"><div className="cover"><CatalogLogo src={set.logo} alt={set.name} /></div><span className="catalog-code">{alias(set.id)} · {year(set.releaseDate)}</span><h5>{set.name}</h5><div className="meta">{set.owned}/{set.total} cartes · {euro(set.value)}</div><div className="progress-track"><span style={{ width: `${Math.min(100, (set.owned / Math.max(1,set.total)) * 100)}%` }} /></div></button>)}</section> : <section className="bloc-grid">{filteredSeries.map((item)=><button key={item.id} onClick={() => void openSeries(item)} className="bloc-card neu-card"><div className="cover"><CatalogLogo src={item.logo} alt={item.name} /></div><h5>{item.name}</h5><div className="meta">{item.setCount} série{item.setCount > 1 ? "s" : ""} · {year(item.releaseDate)}</div></button>)}</section>}
  </main>;
}

const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const year = (value?: string | null) => value ? new Date(value).getFullYear() : "—";
const alias = (id: string) => id.replace(/^sv0?/, "EV").replace(/^me0?/, "ME").toUpperCase();
const euro = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);

function CatalogImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} /> : <div className="pokemon-logo-placeholder"><img src="/icon.svg" alt="PokéDeal" /><span>POKÉMON</span></div>;
}

function CatalogLogo({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} /> : <img src="/icon.svg" alt="PokéDeal" />;
}
