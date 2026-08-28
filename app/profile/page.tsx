import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
import { AccountControl } from "@/components/navigation/AccountControl";
import { requireUserPage } from "@/lib/auth/page-user";
import { prisma } from "@/lib/database/prisma";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUserPage();
  const [favorites, binders, sales] = await Promise.all([
    prisma.watchlist.count({ where: { userId: user.id } }),
    prisma.collectorBinder.count({ where: { userId: user.id } }),
    prisma.collectionSale.count({ where: { userId: user.id } }),
  ]);
  const isAdmin = user.role === "ADMIN";
  return <main className="app-page"><header className="page-hero flex flex-col gap-5 sm:flex-row sm:items-center"><div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-[1.5rem] bg-blue-400/10 text-3xl font-bold text-blue-300">{user.image?<img src={user.image} alt="" className="h-full w-full object-cover"/>:(user.name?.[0]||"P")}</div><div className="min-w-0 flex-1"><p className="eyebrow">Profil PokéDeal</p><h1 className="truncate">{user.name||"Collectionneur"}</h1><p>{user.email}{isAdmin?" · Administrateur":" · Collectionneur"}</p></div><AccountControl/></header><section className="mt-7 grid gap-4 sm:grid-cols-3"><ProfileLink href="/collection/wishlist" value={favorites} label="Souhaits suivis" icon="☆"/><ProfileLink href="/collection" value={binders} label="Classeurs" icon="◫"/><ProfileLink href="/collection/sales" value={sales} label="Ventes" icon="↗"/></section>{isAdmin&&<Link href="/settings" className="neu-card interactive-card mt-5 flex items-center gap-4"><span className="feature-icon">⚙</span><div><h2 className="font-bold">Configuration administrateur</h2><p className="mt-1 text-sm text-slate-500">Scanner Go, filtres, imports et santé du système.</p></div><span className="ml-auto text-blue-300">→</span></Link>}</main>;
}

function ProfileLink({href,value,label,icon}:{href:string;value:number;label:string;icon:string}){return <Link href={href} className="neu-card interactive-card"><span className="feature-icon">{icon}</span><strong className="mt-5 block text-3xl">{value}</strong><span className="text-sm text-slate-500">{label}</span></Link>}
