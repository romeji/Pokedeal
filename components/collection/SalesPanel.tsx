"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect,useMemo,useState } from "react";
import Link from "next/link";
type Sale={id:string;name:string;imageUrl:string|null;setName:string|null;quantity:number;unitSalePrice:number;fees:number;unitCostBasis:number|null;revenue:number;pnl:number|null;soldAt:string};

export function SalesPanel(){
  const[rows,setRows]=useState<Sale[]>([]);const[loading,setLoading]=useState(true);
  async function load(){const response=await fetch("/api/collection-sales");if(response.ok)setRows(await response.json());setLoading(false)}
  useEffect(()=>{void load()},[]);
  const stats=useMemo(()=>({revenue:rows.reduce((sum,row)=>sum+row.revenue,0),pnl:rows.reduce((sum,row)=>sum+(row.pnl??0),0)}),[rows]);
  async function remove(id:string){if((await fetch(`/api/collection-sales?id=${id}`,{method:"DELETE"})).ok)setRows((current)=>current.filter((row)=>row.id!==id))}
  return <main className="app-page maquette-page sales-page"><header className="maquette-topbar"><div><span>Transactions</span><h1>Historique des ventes</h1></div><div className="topbar-actions"><Link href="/portfolio" className="circle-action" aria-label="Retour">←</Link></div></header>
    <section className="sales-summary"><div className="summary-card neu-card"><span className="lab">Chiffre d'affaires net</span><strong className="num">{euro(stats.revenue)}</strong></div><div className="summary-card neu-card"><span className="lab">P&amp;L réalisé</span><strong className={`num ${stats.pnl>=0?"gain":"loss"}`}>{signedEuro(stats.pnl)}</strong></div></section>
    {loading?<div className="loading-panel">Chargement…</div>:rows.length?<section className="sales-list">{rows.map((row)=><article key={row.id} className="sale-row neu-card">{row.imageUrl?<img src={row.imageUrl} alt=""/>:<div className="sale-thumb">↗</div>}<div className="sale-main"><strong>{row.name}</strong><small>{row.quantity} × {euro(row.unitSalePrice)} · {new Date(row.soldAt).toLocaleDateString("fr-FR")}</small></div><div className="sale-values"><span>Net <b>{euro(row.revenue)}</b></span><span>P&amp;L <b className={row.pnl!==null&&row.pnl>=0?"gain":"loss"}>{row.pnl===null?"—":signedEuro(row.pnl)}</b></span></div><button onClick={()=>void remove(row.id)} aria-label="Supprimer la vente">×</button></article>)}</section>:<div className="loading-panel">Aucune vente. Ouvre une fiche de ta collection puis utilise « Vendre ».</div>}
  </main>;
}
const euro=(value:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(value);const signedEuro=(value:number)=>`${value>=0?"+":""}${euro(value)}`;
