import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/user";
import { entryUnitValue } from "@/lib/collections/valuation";
import { prisma } from "@/lib/database/prisma";
import { assetImage, assetLogo, getSeries, getSet, listSeries } from "@/lib/tcgdex/client";

const normalized = (value?: string | null) => (value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const url = new URL(request.url);
  const seriesId = url.searchParams.get("series");
  const setId = url.searchParams.get("set");
  const entries = await prisma.collectionEntry.findMany({
    where: { binder: { userId: user.id } },
    include: { product: { select: { priceSnapshots: { orderBy: { retrievedAt: "desc" }, take: 1, select: { trendPrice: true, avg7Price: true, averagePrice: true, lowPrice: true } } } } },
  });
  const watchlist = await prisma.watchlist.findMany({ where: { userId: user.id }, select: { externalId: true } });
  const wished = new Set(watchlist.flatMap((row) => row.externalId ? [row.externalId] : []));
  const owned = new Set(entries.filter((entry) => entry.kind === "CARD" && entry.quantity > 0).map((entry) => entry.externalId));
  const setStats = new Map<string, { owned: Set<string>; value: number }>();
  for (const entry of entries) {
    if (!entry.setName || entry.quantity <= 0) continue;
    const key = normalized(entry.setName);
    const current = setStats.get(key) ?? { owned: new Set<string>(), value: 0 };
    current.owned.add(entry.externalId);
    current.value += entryUnitValue(entry) * entry.quantity;
    setStats.set(key, current);
  }

  if (setId) {
    const set = await getSet(setId, "fr");
    return NextResponse.json({
      type: "set",
      set: { id: set.id, name: set.name, logo: assetLogo(set.logo), releaseDate: set.releaseDate, total: set.cardCount.total },
      cards: set.cards.map((card) => ({ id: card.id, name: card.name, number: card.localId, imageUrl: assetImage(card.image), owned: owned.has(card.id), wished: wished.has(card.id) })),
    });
  }

  if (seriesId) {
    const series = await getSeries(seriesId, "fr");
    const detailedSets = await Promise.all(series.sets.map(async (brief) => getSet(brief.id, "fr").catch(() => null)));
    return NextResponse.json({
      type: "series",
      series: { id: series.id, name: series.name, logo: assetLogo(series.logo), releaseDate: series.releaseDate },
      sets: series.sets.map((set, index) => {
        const stats = setStats.get(normalized(set.name));
        return { id: set.id, name: set.name, logo: assetLogo(set.logo), releaseDate: detailedSets[index]?.releaseDate ?? null, total: set.cardCount.total, owned: stats?.owned.size ?? 0, value: stats?.value ?? 0 };
      }),
    });
  }

  const series = await listSeries("fr");
  const details = await Promise.all(series.map((item) => getSeries(item.id, "fr").catch(() => null)));
  return NextResponse.json({
    type: "series-list",
    series: series.map((item, index) => ({ id: item.id, name: item.name, logo: assetLogo(item.logo), releaseDate: details[index]?.releaseDate ?? null, setCount: details[index]?.sets.length ?? 0 })).reverse(),
  });
}
