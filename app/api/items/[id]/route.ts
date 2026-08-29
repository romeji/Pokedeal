import { NextResponse } from "next/server";
import { getAdminUser, getRequestUser } from "@/lib/auth/user";
import { prisma } from "@/lib/database/prisma";
import { resolveCardImage } from "@/lib/tcgdex/client";
import { getEbayActiveMarket } from "@/lib/ebay/market";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getRequestUser(request);
  const product = await prisma.cardmarketProduct.findUnique({
    where: { id },
    include: {
      set: true,
      priceSnapshots: { orderBy: { retrievedAt: "asc" }, take: 500 },
      productMatches: { where: { listing: { status: { notIn: ["SOLD", "REMOVED", "EXPIRED"] } } }, orderBy: { createdAt: "desc" }, take: 50, include: { listing: { include: { images: { take: 1 } } } } },
    },
  });
  if (!product) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  const [favorite, owned, binders] = user ? await Promise.all([
    prisma.watchlist.findFirst({ where: { userId: user.id, productId: product.id }, select: { id: true } }),
    prisma.collectionEntry.findMany({
      where: { productId: product.id, quantity: { gt: 0 }, binder: { userId: user.id } },
      include: { binder: { select: { id: true, name: true } } },
    }),
    prisma.collectorBinder.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]) : [null, [], []];
  let imageUrl = product.imageUrl ?? product.productMatches.find((match) => match.listing.images[0])?.listing.images[0]?.url ?? null;
  if (!imageUrl && product.kind === "SINGLE") {
    imageUrl = await resolveCardImage(product.cardmarketProductId, product.name);
  }
  if (imageUrl && imageUrl !== product.imageUrl) {
    await prisma.cardmarketProduct.update({ where: { id: product.id }, data: { imageUrl } }).catch(() => undefined);
  }
  const activeListings = [...new Map(product.productMatches.map((match) => [match.listing.id, match.listing])).values()];
  const prices = activeListings.map((listing) => Number(listing.price)).sort((a,b)=>a-b);
  const vintedMedian = prices.length ? prices[Math.floor(prices.length / 2)]! : null;
  const ebay = await getEbayActiveMarket(product.name).catch(() => ({ configured: Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET), median: null, count: 0, url: null }));
  const snapshots = product.priceSnapshots.map((snapshot) => ({ date: snapshot.retrievedAt, probable: Number(snapshot.trendPrice ?? snapshot.avg7Price ?? snapshot.averagePrice ?? snapshot.lowPrice ?? 0), low: snapshot.lowPrice === null ? null : Number(snapshot.lowPrice), average: snapshot.averagePrice === null ? null : Number(snapshot.averagePrice) }));
  return NextResponse.json({
    product: { id: product.id, cardmarketProductId: product.cardmarketProductId, name: product.name, kind: product.kind, setName: product.set?.name, imageUrl },
    canEditImage: user?.role === "ADMIN",
    current: snapshots.at(-1) ?? null,
    history: snapshots,
    favorite: Boolean(favorite),
    owned: owned.map((entry) => ({ id: entry.id, binderId: entry.binder.id, binderName: entry.binder.name, quantity: entry.quantity, purchasePrice: entry.purchasePrice === null ? null : Number(entry.purchasePrice) })),
    binders,
    markets: { cardmarket: snapshots.at(-1)?.probable ?? null, vintedActiveMedian: vintedMedian, vintedCount: activeListings.length, ebay },
    activeListings: activeListings.slice(0, 12).map((listing) => ({ id: listing.id, title: listing.title, url: listing.url, price: Number(listing.price), country: listing.sellerCountry, condition: listing.itemCondition, imageUrl: listing.images[0]?.url ?? null, publishedAt: listing.publishedAt ?? listing.firstSeenAt })),
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminUser(request)) return NextResponse.json({ error: "Accès administrateur requis" }, { status: 403 });
  const { id } = await params;
  const body = await request.json() as { imageUrl?: string };
  const imageUrl = body.imageUrl?.trim();
  if (!imageUrl || !/^https:\/\//i.test(imageUrl)) return NextResponse.json({ error: "URL HTTPS d'image requise" }, { status: 400 });
  const probe = await fetch(imageUrl, { method: "HEAD", signal: AbortSignal.timeout(8_000) }).catch(() => null);
  if (!probe?.ok || !probe.headers.get("content-type")?.startsWith("image/")) return NextResponse.json({ error: "Cette adresse ne renvoie pas une image accessible" }, { status: 400 });
  await prisma.cardmarketProduct.update({ where: { id }, data: { imageUrl } });
  return NextResponse.json({ id, imageUrl });
}
