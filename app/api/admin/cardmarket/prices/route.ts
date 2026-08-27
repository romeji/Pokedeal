import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { isAdminRequest } from "@/lib/admin/auth";
import { assertProviderApproved } from "@/lib/compliance/complianceGate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Price = { idProduct:number; low:number|null; avg:number|null; trend:number|null; avg1:number|null; avg7:number|null; avg30:number|null; "low-holo":number|null; "avg-holo":number|null; "trend-holo":number|null; "avg1-holo":number|null; "avg7-holo":number|null; "avg30-holo":number|null };

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error:"Accès refusé" }, { status:401 });
  await assertProviderApproved("cardmarket");
  const body = await request.json() as { prices?:Price[]; retrievedAt?:string };
  if (!Array.isArray(body.prices) || body.prices.length > 300) return NextResponse.json({ error:"Lot invalide (300 prix maximum)" }, { status:400 });
  const source = await prisma.priceSource.upsert({ where:{ name:"cardmarket" }, update:{ isPrimary:true }, create:{ name:"cardmarket", isPrimary:true } });
  const products = await prisma.cardmarketProduct.findMany({ where:{ cardmarketProductId:{ in:body.prices.map(p=>p.idProduct) } }, select:{ id:true,cardmarketProductId:true } });
  const ids = new Map(products.map(p=>[p.cardmarketProductId,p.id]));
  const retrievedAt = body.retrievedAt && !Number.isNaN(Date.parse(body.retrievedAt)) ? new Date(body.retrievedAt) : new Date();
  const data = body.prices.flatMap(p => { const productId=ids.get(p.idProduct); return productId ? [{ productId,sourceId:source.id,retrievedAt,currency:"EUR",lowPrice:p.low,averagePrice:p.avg,trendPrice:p.trend,avg1Price:p.avg1,avg7Price:p.avg7,avg30Price:p.avg30,lowPriceHolo:p["low-holo"],averagePriceHolo:p["avg-holo"],trendPriceHolo:p["trend-holo"],avg1PriceHolo:p["avg1-holo"],avg7PriceHolo:p["avg7-holo"],avg30PriceHolo:p["avg30-holo"] }] : []; });
  await prisma.priceSnapshot.createMany({ data });
  return NextResponse.json({ imported:data.length, skipped:body.prices.length-data.length });
}
