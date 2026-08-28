import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/user";
import { recordCollectionActivity } from "@/lib/collections/activity";
import { recordBinderSnapshot } from "@/lib/collections/valuation";
import { prisma } from "@/lib/database/prisma";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const sales = await prisma.collectionSale.findMany({ where: { userId: user.id }, orderBy: { soldAt: "desc" } });
  return NextResponse.json(sales.map((sale) => {
    const revenue = Number(sale.unitSalePrice) * sale.quantity - Number(sale.fees);
    const cost = sale.unitCostBasis === null ? null : Number(sale.unitCostBasis) * sale.quantity;
    return { ...sale, unitSalePrice: Number(sale.unitSalePrice), fees: Number(sale.fees), unitCostBasis: sale.unitCostBasis === null ? null : Number(sale.unitCostBasis), revenue, pnl: cost === null ? null : revenue - cost };
  }));
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const body = await request.json() as { entryId?: string; quantity?: number; unitSalePrice?: number; fees?: number; soldAt?: string };
  const quantity = Math.max(1, Math.round(Number(body.quantity) || 0));
  const unitSalePrice = Number(body.unitSalePrice);
  if (!body.entryId || !Number.isFinite(unitSalePrice) || unitSalePrice < 0) return NextResponse.json({ error: "Vente invalide" }, { status: 400 });
  const entry = await prisma.collectionEntry.findFirst({ where: { id: body.entryId, binder: { userId: user.id } }, include: { binder: { select: { id: true } } } });
  if (!entry) return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  if (quantity > entry.quantity) return NextResponse.json({ error: `Quantité disponible : ${entry.quantity}` }, { status: 400 });
  const soldAt = body.soldAt ? new Date(body.soldAt) : new Date();
  if (Number.isNaN(soldAt.getTime())) return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  const sale = await prisma.$transaction(async (tx) => {
    const row = await tx.collectionSale.create({ data: { userId: user.id, entryId: entry.id, externalId: entry.externalId, name: entry.name, imageUrl: entry.imageUrl, setName: entry.setName, quantity, unitSalePrice, fees: Math.max(0, Number(body.fees) || 0), unitCostBasis: entry.purchasePrice, soldAt } });
    await tx.collectionEntry.update({ where: { id: entry.id }, data: { quantity: { decrement: quantity } } });
    return row;
  });
  await recordCollectionActivity(entry.binder.id, "ENTRY_SOLD", entry.name, { quantity, unitSalePrice });
  await recordBinderSnapshot(entry.binder.id);
  return NextResponse.json(sale, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Vente requise" }, { status: 400 });
  const sale = await prisma.collectionSale.findFirst({ where: { id, userId: user.id } });
  if (!sale) return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    if (sale.entryId) await tx.collectionEntry.updateMany({ where: { id: sale.entryId, binder: { userId: user.id } }, data: { quantity: { increment: sale.quantity } } });
    await tx.collectionSale.delete({ where: { id: sale.id } });
  });
  return NextResponse.json({ deleted: true, restoredQuantity: sale.entryId ? sale.quantity : 0 });
}
