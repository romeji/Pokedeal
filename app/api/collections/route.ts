import { BinderType, ProductKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/user";
import { entryUnitValue } from "@/lib/collections/valuation";
import { recordCollectionActivity } from "@/lib/collections/activity";
import { prisma } from "@/lib/database/prisma";
import { assetLogo, getSet } from "@/lib/tcgdex/client";

export const dynamic = "force-dynamic";

const entryPriceSelect = {
  quantity: true,
  manualValue: true,
  product: {
    select: {
      priceSnapshots: {
        orderBy: { retrievedAt: "desc" as const },
        take: 1,
        select: { trendPrice: true, avg7Price: true, averagePrice: true, lowPrice: true },
      },
    },
  },
};

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const binders = await prisma.collectorBinder.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      entries: { where: { quantity: { gt: 0 } }, select: entryPriceSelect },
      valueSnapshots: { orderBy: { recordedAt: "desc" }, take: 8 },
    },
  });
  return NextResponse.json(
    binders.map((binder) => {
      const value = binder.entries.reduce((sum, entry) => sum + entryUnitValue(entry) * entry.quantity, 0);
      const owned = binder.entries.length;
      return {
        id: binder.id,
        name: binder.name,
        description: binder.description,
        type: binder.type,
        setName: binder.tcgdexSetName,
        coverImageUrl: binder.coverImageUrl,
        accentColor: binder.accentColor,
        owned,
        totalItems: binder.entries.reduce((sum, entry) => sum + entry.quantity, 0),
        target: binder.targetCount,
        progress: binder.targetCount ? Math.min(100, Math.round((owned / binder.targetCount) * 100)) : null,
        value,
        updatedAt: binder.updatedAt,
        history: binder.valueSnapshots.map((snapshot) => ({
          value: Number(snapshot.value),
          recordedAt: snapshot.recordedAt,
        })).reverse(),
      };
    }),
  );
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const body = (await request.json()) as {
    name?: string;
    description?: string;
    type?: BinderType;
    setId?: string;
    accentColor?: string;
  };
  const allowed = new Set<BinderType>(Object.values(BinderType));
  const type = body.type && allowed.has(body.type) ? body.type : BinderType.CUSTOM;
  let setFr = null;
  let setEn = null;
  let targetCount: number | null = null;
  if (type === BinderType.MASTER_CARDS || type === BinderType.MASTER_ITEMS) {
    if (!body.setId) return NextResponse.json({ error: "Série requise" }, { status: 400 });
    [setFr, setEn] = await Promise.all([getSet(body.setId, "fr"), getSet(body.setId, "en")]);
    if (type === BinderType.MASTER_CARDS) targetCount = setFr.cardCount.total;
    if (type === BinderType.MASTER_ITEMS) {
      targetCount = await prisma.cardmarketProduct.count({
        where: {
          kind: { not: ProductKind.SINGLE },
          OR: [
            { name: { contains: setEn.name, mode: "insensitive" } },
            { name: { contains: setFr.name, mode: "insensitive" } },
          ],
        },
      });
    }
  }
  const name = body.name?.trim() ||
    (type === BinderType.GLOBAL ? "Ma collection globale" :
      type === BinderType.MASTER_ITEMS ? `Master items · ${setFr?.name}` :
        type === BinderType.MASTER_CARDS ? `Master set · ${setFr?.name}` : "Nouveau classeur");
  const binder = await prisma.collectorBinder.create({
    data: {
      userId: user.id,
      name,
      description: body.description?.trim() || null,
      type,
      tcgdexSetId: setFr?.id ?? null,
      tcgdexSetName: setFr?.name ?? null,
      tcgdexSetNameEn: setEn?.name ?? null,
      coverImageUrl: assetLogo(setFr?.logo),
      targetCount,
      accentColor: /^#[0-9a-f]{6}$/i.test(body.accentColor ?? "") ? body.accentColor! : "#38bdf8",
    },
  });
  await recordCollectionActivity(binder.id, "BINDER_CREATED", binder.name, { type: binder.type });
  return NextResponse.json(binder, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Classeur requis" }, { status: 400 });
  const result = await prisma.collectorBinder.deleteMany({ where: { id, userId: user.id } });
  return NextResponse.json({ deleted: result.count > 0 });
}
