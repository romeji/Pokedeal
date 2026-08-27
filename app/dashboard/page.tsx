import Link from "next/link";
import { prisma } from "@/lib/database/prisma";
import { ScoreBadge } from "@/components/dashboard/ScoreBadge";
export const dynamic="force-dynamic";
const euro=(v:unknown)=>`${Number(v??0).toFixed(2)} €`;
export default async function DashboardPage(){
  let products=0,prices=0,listings=0; let opportunities:any[]=[];
  try { [products,prices,listings,opportunities]=await Promise.all([prisma.cardmarketProduct.count(),prisma.priceSnapshot.count(),prisma.listing.count(),prisma.opportunity.findMany({where:{estimatedProfit:{gt:0},listing:{status:{notIn:["SOLD","REMOVED","EXPIRED"]}}},include:{listing:true,score:true},orderBy:{estimatedProfit:"desc"},take:6})]); } catch {}
  const profit=opportunities.reduce((s,o)=>s+Number(o.estimatedProfit??0),0);
  return <main className="p-5 md:p-10"><header className="mb-8"><p className="eyebrow">Intelligence marché</p><h1 className="mt-2 font-display text-4xl font-bold">Centre de contrôle</h1><p className="mt-2 max-w-2xl text-slate-400">Prix Cardmarket, opportunités actives et santé du scanner en un coup d’œil.</p></header>
    <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Produits Cardmarket',products],['Prix historiques',prices],['Annonces collectées',listings],['Profit potentiel',euro(profit)]].map(([l,v])=><div className="metric" key={String(l)}><div className="text-3xl font-bold text-slate-50">{v}</div><div className="mt-2 text-sm text-slate-400">{l}</div></div>)}</section>
    <section className="surface overflow-hidden"><div className="flex items-center justify-between border-b border-slate-700/40 p-5"><div><p className="eyebrow">Top deals</p><h2 className="mt-1 text-xl font-semibold">Opportunités encore disponibles</h2></div><Link href="/library" className="text-sm text-cyan-300">Tout voir →</Link></div><div className="divide-y divide-slate-700/30">{opportunities.map(o=><a href={o.listing.url} target="_blank" rel="noreferrer" key={o.id} className="grid gap-3 p-5 transition hover:bg-cyan-300/5 md:grid-cols-[1fr_repeat(4,110px)]"><div><div className="font-semibold">{o.listing.title}</div><div className="text-xs text-slate-500">Vu {o.listing.lastSeenAt.toLocaleDateString('fr-FR')}</div></div><div><small className="text-slate-500">Achat</small><div>{euro(o.purchasePrice)}</div></div><div><small className="text-slate-500">Marché</small><div>{euro(o.marketValue)}</div></div><div><small className="text-slate-500">Profit</small><div className="text-emerald-300">+{euro(o.estimatedProfit)}</div></div><div>{o.score?<ScoreBadge score={o.score.score}/>:null}</div></a>)}{!opportunities.length&&<div className="p-10 text-center text-slate-400">Aucune opportunité active. Importe d’abord les données Cardmarket.</div>}</div></section>
  </main>;
}
