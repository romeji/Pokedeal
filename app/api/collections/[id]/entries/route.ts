import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { recordBinderSnapshot } from "@/lib/collections/valuation";
import { prisma } from "@/lib/database/prisma";
import { assetImage, getCard } from "@/lib/tcgdex/client";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const body = (await request.json()) as {
    kind?: "CARD" | "ITEM";
    cardId?: string;
    productId?: string;
    variant?: string;
    condition?: string;
    quantity?: number;
    purchasePrice?: number | null;
  };
  const binder = await prisma.collectorBinder.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!binder) return NextResponse.json({ error: "Classeur introuvable" }, { status: 404 });
  const variant = body.variant?.slice(0, 32) || "normal";
  const condition = body.condition?.slice(0, 16) || "NM";
  const quantity = Math.max(1, Math.min(999, Math.round(body.quantity ?? 1)));
  let data;

  if (body.kind === "CARD" && body.cardId) {
    const card = await getCard(body.cardId, "fr");
    const cardmarketId = card.pricing?.cardmarket?.idProduct;
    const product = cardmarketId ? await prisma.cardmarketProduct.findUnique({
      where: { cardmarketProductId: cardmarketId },
      select: { id: true },
    }) : null;
    data = {
      binderId: binder.id,
      productId: product?.id ?? null,
      externalId: card.id,
      kind: "CARD",
      name: card.name,
      imageUrl: assetImage(card.image),
      setName: card.set.name,
      number: card.localId,
      variant,
      condition,
      quantity,
      purchasePrice: body.purchasePrice ?? null,
      manualValue: product ? null : (card.pricing?.cardmarket?.trend ?? card.pricing?.cardmarket?.avg ?? null),
    };
  } else if (body.kind === "ITEM" && body.productId) {
    const product = await prisma.cardmarketProduct.findUnique({ where: { id: body.productId } });
    if (!product) return NextResponse.json({ error: "Item introuvable" }, { status: 404 });
    data = {
      binderId: binder.id,
      productId: product.id,
      externalId: `cardmarket:${product.id}`,
      kind: "ITEM",
      name: product.name,
      imageUrl: product.imageUrl,
      variant,
      condition,
      quantity,
      purchasePrice: body.purchasePrice ?? null,
    };
  } else {
    return NextResponse.json({ error: "Carte ou item requis" }, { status: 400 });
  }

  const entry = await prisma.collectionEntry.upsert({
    where: { binderId_externalId_variant_condition: { binderId: binder.id, externalId: data.externalId, variant, condition } },
    create: data,
    update: { quantity, purchasePrice: body.purchasePrice ?? undefined },
  });
  await recordBinderSnapshot(binder.id);
  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const entryId = new URL(request.url).searchParams.get("entryId");
  const externalId = new URL(request.url).searchParams.get("externalId");
  if (!entryId && !externalId) return NextResponse.json({ error: "Entrée requise" }, { status: 400 });
  await prisma.collectionEntry.deleteMany({
    where: { binderId: params.id, ...(entryId ? { id: entryId } : { externalId: externalId! }) },
  });
  await recordBinderSnapshot(params.id);
  return NextResponse.json({ deleted: true });
}
