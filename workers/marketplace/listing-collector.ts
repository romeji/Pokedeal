import { prisma } from "@/lib/database/prisma";
import { MockVintedProvider } from "@/lib/marketplace/mock/MockVintedProvider";
import type { MarketplaceProvider } from "@/lib/marketplace/types";
import { computeTitleHash, computeListingHash } from "@/lib/marketplace/dedup";
import { runJob } from "@/lib/workers/runJob";

/**
 * Collecteur d'annonces — en V1, utilise MockVintedProvider (section 28,
 * item 6 : "créer une annonce Vinted mockée"). Le vrai VintedProvider
 * prendra le relais en Phase 6 sans changer ce fichier (c'est tout
 * l'intérêt de l'interface MarketplaceProvider, section 2).
 *
 * Idempotent : upsert par (marketplace, externalId).
 */
export class ListingCollector {
  constructor(private readonly provider: MarketplaceProvider = new MockVintedProvider()) {}

  async collect(query = ""): Promise<{ created: number; updated: number; possibleReposts: number }> {
    const rawListings = await this.provider.searchListings({ query });

    let created = 0;
    let updated = 0;
    let possibleReposts = 0;

    for (const raw of rawListings) {
      const titleHash = computeTitleHash(raw.title);
      const listingHash = computeListingHash(raw.title, raw.price);

      const existing = await prisma.listing.findUnique({
        where: { marketplace_externalId: { marketplace: raw.marketplace, externalId: raw.externalId } },
      });

      // Section 18 : détecte une republication (même titre, externalId
      // différent) sans bloquer l'import — juste tracé pour l'instant.
      if (!existing) {
        const possibleRepost = await prisma.listing.findFirst({
          where: { titleHash, externalId: { not: raw.externalId } },
        });
        if (possibleRepost) possibleReposts++;
      }

      const listing = await prisma.listing.upsert({
        where: { marketplace_externalId: { marketplace: raw.marketplace, externalId: raw.externalId } },
        update: {
          title: raw.title,
          description: raw.description,
          price: raw.price,
          currency: raw.currency,
          titleHash,
          listingHash,
        },
        create: {
          marketplace: raw.marketplace,
          externalId: raw.externalId,
          url: raw.url,
          title: raw.title,
          description: raw.description,
          price: raw.price,
          currency: raw.currency,
          status: "NEW",
          titleHash,
          listingHash,
        },
      });

      if (!existing) {
        for (const imageUrl of raw.imageUrls) {
          await prisma.listingImage.create({ data: { listingId: listing.id, url: imageUrl } });
        }
        created++;
      } else {
        updated++;
      }
    }

    return { created, updated, possibleReposts };
  }
}

if (require.main === module) {
  const [, , query] = process.argv;
  runJob("listing-collector", () => new ListingCollector().collect(query ?? ""))
    .then((r) =>
      console.log(
        `Collecte terminée : ${r.created} créées, ${r.updated} mises à jour, ${r.possibleReposts} republications possibles détectées.`
      )
    )
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
