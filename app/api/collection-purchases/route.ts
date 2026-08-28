import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/user";
import { recordCollectionActivity } from "@/lib/collections/activity";
import { recordBinderSnapshot } from "@/lib/collections/valuation";
import { prisma } from "@/lib/database/prisma";

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const body = await request.json() as { binderId?: string; productId?: string; quantity?: number; unitPurchasePrice?: number };
  const quantity = Math.max(1, Math.min(999, Math.round(Number(body.quantity) || 0)));
  const unitPurchasePrice = Number(body.unitPurchasePrice);
  if (!body.binderId || !body.productId || !Number.isFinite(unitPurchasePrice) || unitPurchasePrice < 0) return NextResponse.json({ error: "Achat invalide" }, { status: 400 });
  const [binder, product] = await Promise.all([
    prisma.collectorBinder.findFirst({ where: { id: body.binderId, userId: user.id }, select: { id: true } }),
    prisma.cardmarketProduct.findUnique({ where: { id: body.productId } }),
  ]);
  if (!binder || !product) return NextResponse.json({ error: "Classeur ou produit introuvable" }, { status: 404 });
  const externalId = `cardmarket:${product.id}`;
  const current = await prisma.collectionEntry.findUnique({ where: { binderId_externalId_variant_condition: { binderId: binder.id, externalId, variant: "sealed", condition: "NM" } } });
  const previousQuantity = current?.quantity ?? 0;
  const previousCost = current?.purchasePrice === null || current?.purchasePrice === undefined ? 0 : Number(current.purchasePrice);
  const weightedCost = ((previousCost * previousQuantity) + (unitPurchasePrice * quantity)) / Math.max(1, previousQuantity + quantity);
  const entry = await prisma.collectionEntry.upsert({
    where: { binderId_externalId_variant_condition: { binderId: binder.id, externalId, variant: "sealed", condition: "NM" } },
    create: { binderId: binder.id, productId: product.id, externalId, kind: product.kind === "SINGLE" ? "CARD" : "ITEM", name: product.name, imageUrl: product.imageUrl, variant: "sealed", condition: "NM", quantity, purchasePrice: unitPurchasePrice },
    update: { quantity: { increment: quantity }, purchasePrice: weightedCost },
  });
  await recordCollectionActivity(binder.id, "PURCHASE_RECORDED", product.name, { quantity, unitPurchasePrice });
  await recordBinderSnapshot(binder.id);
  return NextResponse.json(entry, { status: 201 });
}
