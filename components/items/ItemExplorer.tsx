"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";

type Item = {
  id: string; cardmarketProductId: number; name: string; kind: string; setName: string | null;
  setCode: string | null; imageUrl: string | null; price: { probable: number; low: number | null; trend: number | null; retrievedAt: string } | null;
  priceSource: string | null;
};

export function ItemExplorer() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [message, setMessage] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => { fetch("/api/admin/session").then((response) => response.json()).then((data) => setAuthenticated(Boolean(data.authenticated))).catch(() => undefined); }, []);
  useEffect(() => {
    if (query.trim().length < 2) { setItems([]); return; }
    const timer = window.setTimeout(async () => {
      setLoading(true); setMessage("");
      try { const response = await fetch(`/api/items?q=${encodeURIComponent(query.trim())}`); if (!response.ok) throw new Error("Recherche indisponible"); setItems(await response.json()); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Recherche indisponible"); }
      finally { setLoading(false); }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function analyze(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (!authenticated) { setMessage("Connecte-toi avec Google depuis Profil pour utiliser l’analyse IA."); return; }
    setLoading(true); setMessage("Gemini analyse la photo sans la stocker…");
    const form = new FormData(); form.append("image", file);
    try { const response = await fetch("/api/items/analyze", { method: "POST", body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Analyse impossible"); setQuery(data.query); setMessage(`Identifié : ${[data.analysis.name,data.analysis.setName,data.analysis.number].filter(Boolean).join(" · ")} · confiance ${Math.round((data.analysis.confidence||0)*100)} %`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Analyse impossible"); }
    finally { setLoading(false); }
  }

  return <section className="mt-8">
    <div className="neu-card"><div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="relative min-w-0 flex-1"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">⌕</span><input className="neu-input h-12 w-full pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pikachu, EV2, Flammes Fantasmagoriques, booster bundle…" aria-label="Rechercher un produit Pokémon" /></div><button className="neu-button h-12" onClick={() => photoInput.current?.click()}>✦ Analyser avec l’IA</button><input ref={photoInput} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={analyze}/><div className="view-switch" aria-label="Mode d’affichage"><button className={view==="grid"?"active":""} onClick={()=>setView("grid")} aria-label="Grille">▦</button><button className={view==="list"?"active":""} onClick={()=>setView("list")} aria-label="Liste">☷</button></div></div>{message&&<p className="mt-3 text-sm text-cyan-200">{message}</p>}</div>
    <div className={view === "grid" ? "price-grid mt-6" : "price-list mt-6"}>{items.map((item)=><Link key={item.id} href={`/items/${item.id}`} className={view === "grid" ? "price-card" : "price-row"}><div className="price-image"><ProductImage src={item.imageUrl} alt={item.name} /></div><div className="price-content"><span className="catalog-code">{formatKind(item.kind)}</span><h2>{item.name}</h2><p>{item.setName??item.setCode??`Cardmarket #${item.cardmarketProductId}`}</p>{item.price?<div className="price-values"><strong>{euro(item.price.probable)}</strong><span>bas {euro(item.price.low)}</span></div>:<strong className="mt-3 block text-slate-500">Prix indisponible</strong>}<small>{item.price ? `${item.priceSource} · ${new Date(item.price.retrievedAt).toLocaleDateString("fr-FR")}` : "Ouvrir la fiche"}</small></div></Link>)}</div>
    {!loading&&!items.length&&query.trim().length>=2&&<div className="loading-panel">Aucun résultat. Essaie le code du set (EV2, ME2), son nom français, ou analyse une photo.</div>}{loading&&<div className="loading-panel">Recherche et récupération des visuels…</div>}
  </section>;
}

const euro=(value:number|null)=>value===null?"—":new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(value);
const formatKind=(kind:string)=>kind.toLowerCase().replaceAll("_"," ");
function ProductImage({ src, alt }: { src: string | null; alt: string }) { const [failed, setFailed] = useState(false); return src && !failed ? <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} /> : <div className="pokemon-logo-placeholder"><img src="/icon.svg" alt="PokéDeal" /><span>POKÉMON</span></div>; }
