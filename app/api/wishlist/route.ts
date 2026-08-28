import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/user";
import { prisma } from "@/lib/database/prisma";
import { assetImage, getCard } from "@/lib/tcgdex/client";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const rows = await prisma.watchlist.findMany({
    where: { userId: user.id }, orderBy: { createdAt: "desc" },
    include: { product: { select: { priceSnapshots: { orderBy: { retrievedAt: "desc" }, take: 1, select: { trendPrice: true, avg7Price: true, averagePrice: true, lowPrice: true } } } } },
  });
  return NextResponse.json(rows.map((row) => {
    const price = row.product?.priceSnapshots[0];
    return { id: row.id, externalId: row.externalId, kind: row.kind, name: row.label, imageUrl: row.imageUrl, setName: row.setName, maxPrice: row.maxPrice === null ? null : Number(row.maxPrice), price: Number(price?.trendPrice ?? price?.avg7Price ?? price?.averagePrice ?? price?.lowPrice ?? 0), createdAt: row.createdAt };
  }));
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const body = await request.json() as { externalId?: string; productId?: string; maxPrice?: number | null };
  let externalId = body.externalId?.trim();
  let productId = body.productId?.trim() || null;
  let label = ""; let imageUrl: string | null = null; let setName: string | null = null; let kind = "CARD";
  if (externalId) {
    const card = await getCard(externalId, "fr");
    label = card.name; imageUrl = assetImage(card.image); setName = card.set.name;
    const cardmarketId = card.pricing?.cardmarket?.idProduct;
    if (cardmarketId) productId = (await prisma.cardmarketProduct.findUnique({ where: { cardmarketProductId: cardmarketId }, select: { id: true } }))?.id ?? null;
  } else if (productId) {
    const product = await prisma.cardmarketProduct.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
    externalId = `cardmarket:${product.id}`; label = product.name; imageUrl = product.imageUrl; kind = "ITEM";
  } else return NextResponse.json({ error: "Carte ou item requis" }, { status: 400 });
  const existing = await prisma.watchlist.findFirst({ where: { userId: user.id, OR: [{ externalId }, ...(productId ? [{ productId }] : [])] } });
  const data = { externalId, productId, label, imageUrl, setName, kind, maxPrice: body.maxPrice ?? null };
  const row = existing ? await prisma.watchlist.update({ where: { id: existing.id }, data }) : await prisma.watchlist.create({ data: { userId: user.id, ...data } });
  return NextResponse.json(row, { status: existing ? 200 : 201 });
}

export async function DELETE(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  const externalId = new URL(request.url).searchParams.get("externalId");
  if (!id && !externalId) return NextResponse.json({ error: "Favori requis" }, { status: 400 });
  await prisma.watchlist.deleteMany({ where: { userId: user.id, ...(id ? { id } : { externalId }) } });
  return NextResponse.json({ deleted: true });
}
