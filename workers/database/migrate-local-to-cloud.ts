import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { parse } from "dotenv";

type Row = Record<string, unknown>;

type CopyDelegate = {
  count(): Promise<number>;
  findMany(args: {
    orderBy: { id: "asc" };
    skip: number;
    take: number;
  }): Promise<Row[]>;
  createMany(args: {
    data: Row[];
    skipDuplicates: boolean;
  }): Promise<{ count: number }>;
};

type Table = {
  name: string;
  source: CopyDelegate;
  target: CopyDelegate;
};

const batchSize = 1_000;

async function readDatabaseUrl(fileName: string, preferredKey: string) {
  const values = parse(await readFile(path.resolve(fileName)));
  return values[preferredKey] ?? values.DATABASE_URL;
}

async function copyTable(table: Table) {
  const sourceCount = await table.source.count();
  let copied = 0;

  for (let skip = 0; skip < sourceCount; skip += batchSize) {
    const rows = await table.source.findMany({
      orderBy: { id: "asc" },
      skip,
      take: batchSize,
    });

    const result = await table.target.createMany({
      data: rows,
      skipDuplicates: true,
    });
    copied += result.count;
    process.stdout.write(
      `\r${table.name}: ${Math.min(skip + rows.length, sourceCount)}/${sourceCount}`,
    );
  }

  const targetCount = await table.target.count();
  process.stdout.write(
    `\r${table.name}: ${sourceCount}/${sourceCount} (${copied} ajoutés, ${targetCount} présents)\n`,
  );

  if (targetCount < sourceCount) {
    throw new Error(
      `${table.name}: la cible contient ${targetCount} lignes pour ${sourceCount} attendues`,
    );
  }
}

function delegate(value: unknown) {
  return value as CopyDelegate;
}

async function main() {
  const sourceUrl = await readDatabaseUrl(".env", "DATABASE_URL");
  const targetUrl = await readDatabaseUrl(
    ".env.neon.local",
    "DATABASE_URL_UNPOOLED",
  );

  if (!sourceUrl || !/localhost|127\.0\.0\.1/.test(sourceUrl)) {
    throw new Error("La source doit être la base PostgreSQL locale de .env");
  }
  if (!targetUrl || !/\.neon\.tech(?::|\/)/.test(targetUrl)) {
    throw new Error("La cible doit être la base Neon de .env.neon.local");
  }
  if (sourceUrl === targetUrl) {
    throw new Error("La source et la cible doivent être différentes");
  }

  const source = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
  const target = new PrismaClient({ datasources: { db: { url: targetUrl } } });

  const tables: Table[] = [
    { name: "PokemonSet", source: delegate(source.pokemonSet), target: delegate(target.pokemonSet) },
    { name: "CardmarketProduct", source: delegate(source.cardmarketProduct), target: delegate(target.cardmarketProduct) },
    { name: "PriceSource", source: delegate(source.priceSource), target: delegate(target.priceSource) },
    { name: "PriceSnapshot", source: delegate(source.priceSnapshot), target: delegate(target.priceSnapshot) },
    { name: "ListingFilter", source: delegate(source.listingFilter), target: delegate(target.listingFilter) },
    { name: "MarketplaceMonitor", source: delegate(source.marketplaceMonitor), target: delegate(target.marketplaceMonitor) },
    { name: "Listing", source: delegate(source.listing), target: delegate(target.listing) },
    { name: "ListingImage", source: delegate(source.listingImage), target: delegate(target.listingImage) },
    { name: "ListingItem", source: delegate(source.listingItem), target: delegate(target.listingItem) },
    { name: "ProductMatch", source: delegate(source.productMatch), target: delegate(target.productMatch) },
    { name: "Opportunity", source: delegate(source.opportunity), target: delegate(target.opportunity) },
    { name: "OpportunityScore", source: delegate(source.opportunityScore), target: delegate(target.opportunityScore) },
    { name: "Watchlist", source: delegate(source.watchlist), target: delegate(target.watchlist) },
    { name: "AlertRule", source: delegate(source.alertRule), target: delegate(target.alertRule) },
    { name: "DiscordNotification", source: delegate(source.discordNotification), target: delegate(target.discordNotification) },
    { name: "ProviderComplianceReview", source: delegate(source.providerComplianceReview), target: delegate(target.providerComplianceReview) },
    { name: "WorkerRun", source: delegate(source.workerRun), target: delegate(target.workerRun) },
  ];

  try {
    await source.$connect();
    await target.$connect();

    for (const table of tables) {
      await copyTable(table);
    }
  } finally {
    await Promise.allSettled([source.$disconnect(), target.$disconnect()]);
  }
}

main().catch((error) => {
  console.error("Migration interrompue:", error);
  process.exitCode = 1;
});
