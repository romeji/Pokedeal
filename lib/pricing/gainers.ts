import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";

type RawGainer = { id: string; name: string; imageUrl: string | null; kind: string; oldPrice: unknown; currentPrice: unknown; changePercent: unknown };
export type MarketGainer = { id: string; name: string; imageUrl: string | null; kind: string; oldPrice: number; currentPrice: number; changePercent: number };

export async function getTopGainers(limit = 50, days = 7): Promise<MarketGainer[]> {
  const safeLimit = Math.min(100, Math.max(1, limit));
  const since = new Date(Date.now() - Math.max(1, days) * 86_400_000);
  const rows = await prisma.$queryRaw<RawGainer[]>(Prisma.sql`
    WITH priced AS (
      SELECT "productId", "retrievedAt",
        COALESCE("trendPrice", "avg7Price", "averagePrice", "lowPrice")::double precision AS price
      FROM "PriceSnapshot"
      WHERE "retrievedAt" >= ${since}
        AND COALESCE("trendPrice", "avg7Price", "averagePrice", "lowPrice") > 0
    ), bounds AS (
      SELECT DISTINCT "productId",
        FIRST_VALUE(price) OVER (PARTITION BY "productId" ORDER BY "retrievedAt" ASC) AS old_price,
        FIRST_VALUE(price) OVER (PARTITION BY "productId" ORDER BY "retrievedAt" DESC) AS current_price,
        MIN("retrievedAt") OVER (PARTITION BY "productId") AS first_at,
        MAX("retrievedAt") OVER (PARTITION BY "productId") AS last_at
      FROM priced
    )
    SELECT p.id, p.name, p."imageUrl", p.kind::text AS kind,
      b.old_price AS "oldPrice", b.current_price AS "currentPrice",
      ((b.current_price - b.old_price) / b.old_price * 100) AS "changePercent"
    FROM bounds b
    JOIN "CardmarketProduct" p ON p.id = b."productId"
    WHERE b.current_price > b.old_price AND b.last_at > b.first_at
      AND ((b.current_price - b.old_price) / b.old_price * 100) <= 300
    ORDER BY "changePercent" DESC
    LIMIT ${safeLimit}
  `);
  return rows.map((row) => ({ ...row, oldPrice: Number(row.oldPrice), currentPrice: Number(row.currentPrice), changePercent: Number(row.changePercent) }));
}
