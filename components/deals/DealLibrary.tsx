"use client";
/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities, react-hooks/exhaustive-deps */

import { useEffect, useState } from "react";
import { dealVerificationLabel } from "@/lib/deals/visibility";

type Deal = { id:string; title:string; description?:string|null; url:string; imageUrl?:string|null; price:number; marketValue:number|null; profit:number|null; roi:number|null; score:number|null; category?:string|null; confidence:number|null; risk:number|null; listingStatus:string; country?:string|null; condition?:string|null; publishedAt:string; decision:string };
type Sort = "score" | "roi" | "recent";

export function DealLibrary() {
  const [rows,setRows]=useState<Deal[]>([]);
  const [scope,setScope]=useState<"active"|"treated">("active");
  const [sort,setSort]=useState<Sort>("score");
  const [view,setView]=useState<"grid"|"list">("list");
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [q,setQ]=useState(""); const [country,setCountry]=useState(""); const [condition,setCondition]=useState(""); const [since,setSince]=useState(""); const [minScore,setMinScore]=useState(""); const [minRoi,setMinRoi]=useState("");
  const [page,setPage]=useState(1); const [pageSize,setPageSize]=useState(18); const [pages,setPages]=useState(1); const [total,setTotal]=useState(0); const [busy,setBusy]=useState(true); const [message,setMessage]=useState("");
  const [resetVersion,setResetVersion]=useState(0);

  async function load(target=1) {
    setBusy(true); setMessage("");
    const params=new URLSearchParams({page:String(target),pageSize:String(pageSize),scope,sort});
    if(q)params.set("q",q); if(country)params.set("country",country); if(condition)params.set("condition",condition); if(since)params.set("since",since); if(minScore)params.set("minScore",minScore); if(minRoi)params.set("minRoi",minRoi);
    const response=await fetch(`/api/deals?${params}`,{cache:"no-store"}); const body=await response.json();
    if(response.ok){setRows(body.rows);setPage(body.page);setPages(body.pages);setTotal(body.total);}else setMessage(body.error||"Chargement impossible");
    setBusy(false);
  }
  useEffect(()=>{void load(1);},[pageSize,scope,sort,minScore,minRoi,resetVersion]);

  async function decide(id:string,status:string){
    const response=await fetch("/api/deals",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({opportunityId:id,status})}); const body=await response.json();
    if(!response.ok){setMessage(body.error||"Connexion requise");return;}
    setRows((current)=>scope==="active"&&["BOUGHT","IGNORED"].includes(status)?current.filter((row)=>row.id!==id):current.map((row)=>row.id===id?{...row,decision:status}:row));
    setMessage("Décision enregistrée dans ton compte.");
  }
  function reset(){setQ("");setCountry("");setCondition("");setSince("");setMinScore("");setMinRoi("");setSort("score");setResetVersion((value)=>value+1);}

  return <main className="app-page maquette-page deals-page">
    <header className="maquette-topbar"><div><span>Bonnes affaires</span><h1>Deals</h1></div><div className="topbar-actions"><button className={`circle-action ${filtersOpen?"active":""}`} onClick={()=>setFiltersOpen((value)=>!value)} aria-label="Filtres">☷</button></div></header>
    <div className="deal-tabs neu-inset"><button className={scope==="active"?"active":""} onClick={()=>setScope("active")}>En cours</button><button className={scope==="treated"?"active":""} onClick={()=>setScope("treated")}>Traités</button></div>
    <div className="deal-search-row"><input className="neu-input" value={q} onChange={(event)=>setQ(event.target.value)} onKeyDown={(event)=>{if(event.key==="Enter")void load(1)}} placeholder="Rechercher dans les annonces…"/><button className="circle-action" onClick={()=>void load(1)} aria-label="Rechercher">⌕</button><button className={`circle-action ${view==="grid"?"active":""}`} onClick={()=>setView(view==="list"?"grid":"list")} aria-label="Changer l'affichage">{view==="list"?"▦":"☰"}</button></div>
    <div className="pill-row deal-pills"><button className={sort==="score"&&!minRoi?"pill active":"pill"} onClick={()=>{setMinRoi("");setSort("score")}}>Tout</button><button className={minScore==="80"?"pill active":"pill"} onClick={()=>{setMinScore("80");setSort("score")}}>Score 80+</button><button className={sort==="score"&&minScore!=="80"?"pill":"pill"} onClick={()=>setSort("score")}>Meilleur score</button><button className={sort==="roi"?"pill active":"pill"} onClick={()=>setSort("roi")}>ROI le + haut</button><button className={sort==="recent"?"pill active":"pill"} onClick={()=>setSort("recent")}>Plus récents</button></div>
    {filtersOpen&&<section className="deal-filter-sheet neu-inset"><div className="filter-sheet-head"><div><span>Filtres avancés</span><strong>Affiner les annonces</strong></div><button onClick={reset}>Réinitialiser</button></div><div className="deal-filter-grid"><label>Pays<input className="neu-input" value={country} onChange={(e)=>setCountry(e.target.value)} placeholder="FR, BE…"/></label><label>État<input className="neu-input" value={condition} onChange={(e)=>setCondition(e.target.value)} placeholder="Neuf, bon état…"/></label><label>Publiée depuis<input className="neu-input" type="date" value={since} onChange={(e)=>setSince(e.target.value)}/></label><label>Score minimum<input className="neu-input" type="number" min="0" max="100" value={minScore} onChange={(e)=>setMinScore(e.target.value)} placeholder="0–100"/></label><label>ROI minimum<input className="neu-input" type="number" min="0" value={minRoi} onChange={(e)=>setMinRoi(e.target.value)} placeholder="Ex. 20 %"/></label><label>Résultats<select className="neu-input" value={pageSize} onChange={(e)=>setPageSize(Number(e.target.value))}><option value="12">12 par page</option><option value="18">18 par page</option><option value="30">30 par page</option><option value="60">60 par page</option></select></label></div><button className="button-primary apply-filters" onClick={()=>void load(1)}>Afficher les résultats</button></section>}
    <div className="deal-result-head"><span><b>{total}</b> opportunité{total>1?"s":""}</span><small>{scope==="active"?"Annonces encore actives":"Décisions enregistrées"}</small></div>
    {message&&<p className="status-message">{message}</p>}
    {busy?<div className="loading-panel">Analyse des deals…</div>:<section className={`deal-full-results ${view}`}>{rows.map((deal)=><DealCard key={deal.id} deal={deal} decide={decide}/>) }{!rows.length&&<div className="neu-card empty-inline">Aucun deal ne correspond à ces filtres.</div>}</section>}
    <div className="pagination"><button className="neu-button" disabled={page<=1} onClick={()=>void load(page-1)}>← Précédent</button><span>Page {page} / {pages}</span><button className="neu-button" disabled={page>=pages} onClick={()=>void load(page+1)}>Suivant →</button></div>
  </main>;
}

function DealCard({deal,decide}:{deal:Deal;decide:(id:string,status:string)=>Promise<void>}){
  const scoreClass=(deal.score??0)>=80?"score-good":(deal.score??0)>=55?"score-mid":"score-low";
  return <article className={`deal-full neu-card ${deal.decision!=="TO_REVIEW"?"done":""}`}><div className="deal-full-top">{deal.imageUrl?<img className="thumb" src={deal.imageUrl} alt="" loading="lazy"/>:<div className="thumb">🏷</div>}<div className="info"><h4>{deal.title}</h4><div className="meta">Vinted · {relativeDate(deal.publishedAt)} · {deal.country||"pays inconnu"}</div><div className="deal-tags"><span>{deal.condition||"État inconnu"}</span><span>{dealVerificationLabel(deal.listingStatus)}</span></div></div>{deal.score!==null?<div className={`score-badge ${scoreClass}`}>{deal.score}<span>/100</span></div>:<div className="score-badge score-low">—</div>}</div><div className="deal-stats"><div className="cell"><span>Achat</span><strong>{euro(deal.price)}</strong></div><div className="cell"><span>Marché</span><strong>{deal.marketValue===null?"—":euro(deal.marketValue)}</strong></div><div className="cell"><span>Profit</span><strong className="gain">{deal.profit===null?"—":`+${euro(deal.profit)}`}</strong></div><div className="cell"><span>ROI</span><strong className="gain">{deal.roi===null?"—":`+${deal.roi.toFixed(0)}%`}</strong></div></div><div className="deal-full-actions"><a href={deal.url} target="_blank" rel="noreferrer" className="button-primary">Voir l'annonce ↗</a><button className={deal.decision==="VALIDATED"?"active":""} onClick={()=>void decide(deal.id,"VALIDATED")}>✓ Valider</button><button className={deal.decision==="BOUGHT"?"active":""} onClick={()=>void decide(deal.id,"BOUGHT")}>＋ Acheté</button><button className={deal.decision==="IGNORED"?"danger active":"danger"} onClick={()=>void decide(deal.id,"IGNORED")}>× Ignorer</button></div></article>;
}
const euro=(value:number)=>new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR"}).format(value);
const relativeDate=(value:string)=>{const minutes=Math.max(1,Math.round((Date.now()-new Date(value).getTime())/60000));return minutes<60?`il y a ${minutes} min`:minutes<1440?`il y a ${Math.round(minutes/60)} h`:`il y a ${Math.round(minutes/1440)} j`;};
