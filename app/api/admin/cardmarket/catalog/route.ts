import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { getAdminUser } from "@/lib/auth/user";
import { assertProviderApproved } from "@/lib/compliance/complianceGate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const KINDS: Record<number, string> = { 51:"SINGLE",52:"BOOSTER",53:"DISPLAY",54:"THEME_DECK",1013:"TRAINER_KIT",1014:"TIN",1015:"BOX_SET",1016:"ELITE_TRAINER_BOX",1017:"COIN",1064:"LOT",1083:"BLISTER" };

type Product = { idProduct:number; idCategory:number; categoryName:string; idExpansion:number; idMetacard:number; name:string; dateAdded:string };

export async function POST(request: Request) {
  if (!await getAdminUser(request)) return NextResponse.json({ error:"Accès refusé" }, { status:401 });
  await assertProviderApproved("cardmarket");
  const body = await request.json() as { products?: Product[] };
  if (!Array.isArray(body.products) || body.products.length > 300) return NextResponse.json({ error:"Lot invalide (300 produits maximum)" }, { status:400 });
  const expansionIds = [...new Set(body.products.map(p => p.idExpansion))];
  for (const id of expansionIds) await prisma.pokemonSet.upsert({ where:{ cardmarketExpansionId:id }, update:{}, create:{ cardmarketExpansionId:id } });
  const sets = await prisma.pokemonSet.findMany({ where:{ cardmarketExpansionId:{ in:expansionIds } } });
  const setMap = new Map(sets.map(s => [s.cardmarketExpansionId, s.id]));
  await prisma.$transaction(body.products.map(p => prisma.cardmarketProduct.upsert({
    where:{ cardmarketProductId:p.idProduct },
    update:{ cardmarketCategoryId:p.idCategory, categoryName:p.categoryName, kind:(KINDS[p.idCategory] ?? "OTHER") as never, name:p.name, setId:setMap.get(p.idExpansion), cardmarketMetacardId:p.idMetacard || null },
    create:{ cardmarketProductId:p.idProduct, cardmarketCategoryId:p.idCategory, categoryName:p.categoryName, kind:(KINDS[p.idCategory] ?? "OTHER") as never, name:p.name, setId:setMap.get(p.idExpansion), cardmarketMetacardId:p.idMetacard || null },
  })));
  return NextResponse.json({ imported:body.products.length });
}
