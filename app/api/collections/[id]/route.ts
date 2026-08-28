import { BinderType, ProductKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/user";
import { entryUnitValue } from "@/lib/collections/valuation";
import { prisma } from "@/lib/database/prisma";
import { assetImage, getSet } from "@/lib/tcgdex/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const { id } = await params;
  const binder = await prisma.collectorBinder.findFirst({
    where: { id, userId: user.id },
    include: {
      entries: {
        where: { quantity: { gt: 0 } },
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            select: {
              priceSnapshots: {
                orderBy: { retrievedAt: "desc" },
                take: 1,
                select: { trendPrice: true, avg7Price: true, averagePrice: true, lowPrice: true, retrievedAt: true },
              },
            },
          },
        },
      },
      valueSnapshots: { orderBy: { recordedAt: "asc" }, take: 30 },
      activities: { orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
  if (!binder) return NextResponse.json({ error: "Classeur introuvable" }, { status: 404 });

  let targets: Array<Record<string, unknown>> = [];
  if (binder.type === BinderType.MASTER_CARDS && binder.tcgdexSetId) {
    const set = await getSet(binder.tcgdexSetId, "fr");
    targets = set.cards.map((card) => ({
      id: card.id,
      name: card.name,
      number: card.localId,
      imageUrl: assetImage(card.image),
      owned: binder.entries.some((entry) => entry.externalId === card.id),
      kind: "CARD",
    }));
  }
  if (binder.type === BinderType.MASTER_ITEMS) {
    const names = [binder.tcgdexSetNameEn, binder.tcgdexSetName].filter(Boolean) as string[];
    const products = names.length ? await prisma.cardmarketProduct.findMany({
      where: {
        kind: { not: ProductKind.SINGLE },
        OR: names.map((name) => ({ name: { contains: name, mode: "insensitive" as const } })),
      },
      orderBy: { name: "asc" },
      take: 200,
      include: { priceSnapshots: { orderBy: { retrievedAt: "desc" }, take: 1 } },
    }) : [];
    targets = products.map((product) => {
      const price = product.priceSnapshots[0];
      return {
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        owned: binder.entries.some((entry) => entry.externalId === `cardmarket:${product.id}`),
        kind: "ITEM",
        productKind: product.kind,
        price: Number(price?.trendPrice ?? price?.avg7Price ?? price?.averagePrice ?? price?.lowPrice ?? 0),
      };
    });
  }

  const entries = binder.entries.map((entry) => ({
    id: entry.id,
    externalId: entry.externalId,
    name: entry.name,
    imageUrl: entry.imageUrl,
    kind: entry.kind,
    number: entry.number,
    variant: entry.variant,
    condition: entry.condition,
    quantity: entry.quantity,
    purchasePrice: entry.purchasePrice === null ? null : Number(entry.purchasePrice),
    manualValue: entry.manualValue === null ? null : Number(entry.manualValue),
    unitValue: entryUnitValue(entry),
    updatedAt: entry.updatedAt,
    language: entry.language,
    notes: entry.notes,
    grader: entry.grader,
    grade: entry.grade,
    certification: entry.certification,
    page: entry.page,
    row: entry.row,
    column: entry.column,
  }));
  return NextResponse.json({
    binder: {
      id: binder.id,
      name: binder.name,
      description: binder.description,
      type: binder.type,
      setName: binder.tcgdexSetName,
      coverImageUrl: binder.coverImageUrl,
      accentColor: binder.accentColor,
      target: binder.targetCount,
    },
    entries,
    targets,
    value: entries.reduce((sum, entry) => sum + entry.unitValue * entry.quantity, 0),
    history: binder.valueSnapshots.map((snapshot) => ({ value: Number(snapshot.value), recordedAt: snapshot.recordedAt })),
    activities: binder.activities,
  });
}
