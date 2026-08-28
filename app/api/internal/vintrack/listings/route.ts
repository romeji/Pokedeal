import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/prisma";
import { isVintrackRequest } from "@/lib/admin/auth";
import { computeListingHash, computeTitleHash } from "@/lib/marketplace/dedup";

export const dynamic = "force-dynamic";
type Incoming = { externalId:string; url:string; title:string; description?:string|null; price:number; currency:string; sellerCountry?:string|null; itemCondition?:string|null; publishedAt?:string|null; imageUrls?:string[] };

export async function POST(request: Request) {
  if (!isVintrackRequest(request)) return NextResponse.json({ error: "Accès refusé" }, { status: 401 });
  const body = await request.json() as { listings?: Incoming[] };
  if (!Array.isArray(body.listings) || body.listings.length > 100) return NextResponse.json({ error: "Lot invalide" }, { status: 400 });
  let created = 0; let updated = 0; let imagesAdded = 0;
  for (const raw of body.listings) {
    if (!raw.externalId || !raw.url || !raw.title || !Number.isFinite(raw.price)) continue;
    const existing = await prisma.listing.findUnique({ where: { marketplace_externalId: { marketplace: "vinted", externalId: String(raw.externalId) } }, include: { images: { select: { url: true } } } });
    const publishedAt = raw.publishedAt && Number.isFinite(new Date(raw.publishedAt).getTime()) ? new Date(raw.publishedAt) : undefined;
    const listing = await prisma.listing.upsert({
      where: { marketplace_externalId: { marketplace: "vinted", externalId: String(raw.externalId) } },
      update: { url:raw.url, title:raw.title, description:raw.description??null, price:raw.price, currency:raw.currency||"EUR", sellerCountry:raw.sellerCountry||undefined, itemCondition:raw.itemCondition||undefined, publishedAt, lastSeenAt:new Date(), listingHash:computeListingHash(raw.title,raw.price), titleHash:computeTitleHash(raw.title) },
      create: { marketplace:"vinted", externalId:String(raw.externalId), url:raw.url, title:raw.title, description:raw.description??null, price:raw.price, currency:raw.currency||"EUR", sellerCountry:raw.sellerCountry||null, itemCondition:raw.itemCondition||null, publishedAt, status:"NEW", listingHash:computeListingHash(raw.title,raw.price), titleHash:computeTitleHash(raw.title) },
    });
    existing ? updated++ : created++;
    const known = new Set(existing?.images.map((image) => image.url) ?? []);
    const fresh = [...new Set(raw.imageUrls ?? [])].filter((url) => /^https:\/\//.test(url) && !known.has(url)).slice(0, Math.max(0, 10-known.size));
    if (fresh.length) { await prisma.listingImage.createMany({ data: fresh.map((url) => ({ listingId:listing.id, url })) }); imagesAdded += fresh.length; }
  }
  return NextResponse.json({ created, updated, imagesAdded });
}
