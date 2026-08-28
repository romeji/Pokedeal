"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";

type Series = { id: string; name: string; logo: string | null; releaseDate: string | null; setCount: number };
type SetRow = { id: string; name: string; logo: string | null; releaseDate: string | null; total: number; owned: number; value: number };
type Card = { id: string; name: string; number: string; imageUrl: string | null; owned: boolean; wished: boolean };
type Binder = { id: string; name: string; type: string };

export function BlocksExplorer() {
  const [series, setSeries] = useState<Series[]>([]);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [selectedSet, setSelectedSet] = useState<SetRow | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [binders, setBinders] = useState<Binder[]>([]);
  const [binderId, setBinderId] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => { void loadSeries(); fetch("/api/collections").then((response) => response.json()).then((rows: Binder[]) => { setBinders(rows); setBinderId(rows[0]?.id ?? ""); }).catch(() => undefined); }, []);

  async function loadSeries() { setBusy(true); const response = await fetch("/api/collections/blocks"); const data = await response.json(); setSeries(data.series ?? []); setSelectedSeries(null); setSelectedSet(null); setBusy(false); }
  async function openSeries(item: Series) { setBusy(true); const response = await fetch(`/api/collections/blocks?series=${encodeURIComponent(item.id)}`); const data = await response.json(); setSelectedSeries(item); setSets(data.sets ?? []); setSelectedSet(null); setBusy(false); }
  async function openSet(item: SetRow) { setBusy(true); const response = await fetch(`/api/collections/blocks?set=${encodeURIComponent(item.id)}`); const data = await response.json(); setSelectedSet({ ...item, ...data.set }); setCards(data.cards ?? []); setBusy(false); }
  function goBack() {
    if (selectedSet) {
      setSelectedSet(null);
      setCards([]);
      return;
    }
    void loadSeries();
  }
  async function toggleWish(card: Card) {
    const response = await fetch(card.wished ? `/api/wishlist?externalId=${encodeURIComponent(card.id)}` : "/api/wishlist", card.wished ? { method: "DELETE" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ externalId: card.id }) });
    if (response.ok) setCards((current) => current.map((item) => item.id === card.id ? { ...item, wished: !item.wished } : item));
  }
  async function addToCollection() {
    if (!selectedCard || !selectedSet) return;
    setBusy(true); setMessage(""); let targetBinder = binderId;
    if (!targetBinder) {
      const created = await fetch("/api/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "MASTER_CARDS", setId: selectedSet.id }) });
      const row = await created.json(); targetBinder = row.id;
      if (!created.ok || !targetBinder) { setMessage(row.error || "Impossible de créer le classeur"); setBusy(false); return; }
    }
    const response = await fetch(`/api/collections/${targetBinder}/entries`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "CARD", cardId: selectedCard.id }) });
    if (response.ok) { setCards((current) => current.map((item) => item.id === selectedCard.id ? { ...item, owned: true } : item)); setSelectedCard(null); setMessage(`${selectedCard.name} ajoutée à la collection.`); }
    else setMessage((await response.json()).error || "Ajout impossible");
    setBusy(false);
  }
  const filteredSeries = series.filter((item) => normalize(`${item.name} ${item.id}`).includes(normalize(query)));
  const filteredSets = sets.filter((item) => normalize(`${item.name} ${item.id} ${alias(item.id)}`).includes(normalize(query)));
  const filteredCards = cards.filter((item) => normalize(`${item.name} ${item.number}`).includes(normalize(query)));

  return <main className="app-page"><header className="page-hero"><p className="eyebrow">Catalogue Pokémon</p><h1>{selectedSet?.name ?? selectedSeries?.name ?? "Blocs & séries"}</h1><p>{selectedSet ? `${selectedSet.owned}/${selectedSet.total} cartes · ${euro(selectedSet.value)}` : selectedSeries ? "Choisis une série pour afficher toutes ses cartes." : "Explore chaque bloc avec son logo, son année, ses séries et ta progression réelle."}</p></header>
    <div className="mt-6 flex flex-wrap items-center gap-3">{(selectedSeries || selectedSet) && <button className="neu-button" onClick={goBack}>← Retour</button>}<input className="neu-input min-w-0 flex-1" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher Fantasmagoriques, EV2, Pikachu…" /></div>
    {message && <p className="status-message">{message}</p>}
    {busy ? <div className="loading-panel">Chargement du catalogue…</div> : selectedSet ? <section className="card-catalog-grid mt-7">{filteredCards.map((card)=><article key={card.id} className={`catalog-card ${card.owned ? "owned" : ""}`}><button className="catalog-card-main" onClick={() => setSelectedCard(card)}>{card.imageUrl ? <img src={card.imageUrl} alt={card.name} loading="lazy" /> : <div className="image-placeholder">◇</div>}<span className="catalog-card-number">#{card.number}</span><h2>{card.name}</h2></button><button className={`wish-button ${card.wished ? "active" : ""}`} onClick={() => void toggleWish(card)} aria-label={card.wished ? "Retirer de la liste de souhaits" : "Ajouter à la liste de souhaits"}>{card.wished ? "★" : "☆"}</button>{card.owned&&<span className="owned-badge">✓</span>}</article>)}</section> : selectedSeries ? <section className="set-catalog-grid mt-7">{filteredSets.map((set)=><button key={set.id} onClick={() => void openSet(set)} className="neu-card set-catalog-card">{set.logo ? <img src={set.logo} alt={set.name} /> : <div className="set-logo-placeholder">PK</div>}<div><span className="catalog-code">{alias(set.id)} · {year(set.releaseDate)}</span><h2>{set.name}</h2><p>{set.owned}/{set.total} cartes</p><strong>{euro(set.value)}</strong></div><div className="progress-track"><span style={{ width: `${Math.min(100, (set.owned / Math.max(1,set.total)) * 100)}%` }} /></div></button>)}</section> : <section className="series-catalog-grid mt-7">{filteredSeries.map((item)=><button key={item.id} onClick={() => void openSeries(item)} className="neu-card series-catalog-card">{item.logo ? <img src={item.logo} alt={item.name} /> : <div className="set-logo-placeholder">PK</div>}<span>{year(item.releaseDate)}</span><h2>{item.name}</h2><p>{item.setCount} série{item.setCount > 1 ? "s" : ""}</p></button>)}</section>}
    {selectedCard && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedCard(null); }}><section className="app-modal"><button className="modal-close" onClick={() => setSelectedCard(null)}>×</button><div className="flex gap-5">{selectedCard.imageUrl&&<img src={selectedCard.imageUrl} alt="" className="h-40 w-28 object-contain" />}<div><p className="eyebrow">{selectedSet?.name}</p><h2 className="mt-2 text-2xl font-bold">{selectedCard.name}</h2><p className="mt-1 text-slate-500">Carte #{selectedCard.number}</p>{selectedCard.owned&&<span className="mt-3 inline-block text-sm text-emerald-300">✓ Déjà dans ta collection</span>}</div></div><label className="mt-6 block text-xs font-semibold uppercase tracking-wider text-slate-500">Classeur de destination</label><select className="neu-input mt-2 w-full" value={binderId} onChange={(event) => setBinderId(event.target.value)}><option value="">Créer automatiquement un master set</option>{binders.map((binder)=><option key={binder.id} value={binder.id}>{binder.name}</option>)}</select><div className="mt-5 grid grid-cols-2 gap-3"><button className="neu-button" onClick={() => void toggleWish(selectedCard)}>{selectedCard.wished ? "★ Retirer souhait" : "☆ Liste de souhaits"}</button><button disabled={busy||selectedCard.owned} className="button-primary" onClick={() => void addToCollection()}>{selectedCard.owned ? "Déjà ajoutée" : "+ Ajouter"}</button></div></section></div>}
  </main>;
}

const normalize = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const year = (value?: string | null) => value ? new Date(value).getFullYear() : "—";
const alias = (id: string) => id.replace(/^sv0?/, "EV").replace(/^me0?/, "ME").toUpperCase();
const euro = (value: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
