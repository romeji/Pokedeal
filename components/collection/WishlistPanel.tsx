"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
type Wish = { id: string; externalId: string | null; kind: string; name: string; imageUrl: string | null; setName: string | null; maxPrice: number | null; price: number };

export function WishlistPanel() {
  const [rows, setRows] = useState<Wish[]>([]); const [loading, setLoading] = useState(true);
  async function load() { const response = await fetch("/api/wishlist"); if (response.ok) setRows(await response.json()); setLoading(false); }
  useEffect(() => { void load(); }, []);
  async function remove(id: string) { if ((await fetch(`/api/wishlist?id=${id}`, { method: "DELETE" })).ok) setRows((current) => current.filter((row) => row.id !== id)); }
  return <main className="app-page"><header className="page-hero"><p className="eyebrow">À surveiller</p><h1>Liste de souhaits</h1><p>Les cartes et items que tu veux acquérir, regroupés dans ta collection plutôt que dans la recherche de prix.</p></header>{loading ? <div className="loading-panel">Chargement…</div> : rows.length ? <section className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map((row)=><article key={row.id} className="neu-card flex items-center gap-4">{row.imageUrl?<img src={row.imageUrl} alt="" className="h-24 w-20 shrink-0 object-contain"/>:<div className="set-logo-placeholder">☆</div>}<div className="min-w-0 flex-1"><span className="catalog-code">{row.setName||row.kind}</span><h2 className="mt-1 truncate font-bold">{row.name}</h2><strong className="mt-2 block text-emerald-300">{row.price ? euro(row.price) : "Prix à synchroniser"}</strong>{row.maxPrice!==null&&<small className="text-slate-500">Alerte sous {euro(row.maxPrice)}</small>}</div><button className="modal-close static shrink-0 text-rose-300" onClick={()=>void remove(row.id)} aria-label="Retirer">×</button></article>)}</section>:<div className="loading-panel">Ta liste de souhaits est vide. Ajoute une carte depuis l’onglet Blocs ou un item depuis sa fiche prix.</div>}</main>;
}
const euro=(value:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(value);
