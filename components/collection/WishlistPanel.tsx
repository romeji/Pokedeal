"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import Link from "next/link";

type Wish = { id:string; externalId:string|null; kind:string; name:string; imageUrl:string|null; setName:string|null; maxPrice:number|null; price:number };

export function WishlistPanel(){
  const[rows,setRows]=useState<Wish[]>([]); const[loading,setLoading]=useState(true);
  async function load(){const response=await fetch("/api/wishlist");if(response.ok)setRows(await response.json());setLoading(false)}
  useEffect(()=>{void load()},[]);
  async function remove(id:string){if((await fetch(`/api/wishlist?id=${id}`,{method:"DELETE"})).ok)setRows((current)=>current.filter((row)=>row.id!==id))}
  return <main className="app-page maquette-page wishlist-page"><header className="maquette-topbar"><div><span>À surveiller</span><h1>Liste de souhaits</h1></div><div className="topbar-actions"><Link href="/collection/blocks" className="circle-action" aria-label="Retour">←</Link></div></header>
    {loading?<div className="loading-panel">Chargement…</div>:rows.length?<section className="wishlist-list">{rows.map((row)=><article key={row.id} className="wish-row neu-card">{row.imageUrl?<img src={row.imageUrl} alt=""/>:<div className="wish-thumb">☆</div>}<div className="wish-info"><span>{row.setName||row.kind}</span><strong>{row.name}</strong><small>{row.price?euro(row.price):"Prix à synchroniser"}{row.maxPrice!==null?` · Alerte sous ${euro(row.maxPrice)}`:""}</small></div><svg viewBox="0 0 100 30"><polyline points="0,20 20,18 40,22 60,14 80,16 100,8" fill="none" stroke="#5b8def" strokeWidth="2.5" strokeLinecap="round"/></svg><button onClick={()=>void remove(row.id)} aria-label="Retirer">×</button></article>)}</section>:<div className="loading-panel">Ta liste est vide. Ajoute une carte depuis les blocs ou un item depuis sa fiche prix.</div>}
  </main>;
}
const euro=(value:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(value);
