import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { looksLikePokemon } from "@/lib/ai/pokemonFilter";
import { evaluateListing } from "@/lib/ai/ListingFilterEngine";
import { GeminiVisionProvider } from "@/lib/ai/gemini/GeminiVisionProvider";
import { ProductMatcher } from "@/lib/matching/ProductMatcher";
import type { IdentifiedItem, VisionProvider } from "@/lib/ai/types";
import { runJob } from "@/lib/workers/runJob";

/**
 * Pipeline section 9 :
 *   Nouvelle annonce → filtre texte → Pokémon probable ?
 *     NON → IGNORER (status EXPIRED n'est pas correct ici; on laisse NEW
 *           mais on ne consomme jamais de quota Gemini dessus)
 *     OUI → Gemini Vision (résultats mis en cache par image) → ListingItem
 *           → ProductMatcher → ProductMatch
 *
 * Traite les Listing en statut NEW, une par une (pas de queue distribuée
 * en V1 — volontairement simple, section 22 : "solution simple et
 * gratuite" pour la V1).
 */
export class ListingAnalyzer {
  constructor(
    private readonly visionProvider: VisionProvider = new GeminiVisionProvider(),
    private readonly matcher: ProductMatcher = new ProductMatcher()
  ) {}

  async runOnce(limit = 20): Promise<{ analyzed: number; ignored: number; errors: number }> {
    const listings = await prisma.listing.findMany({
      where: { status: "NEW" },
      include: { images: true },
      orderBy: { lastSeenAt: "desc" },
      take: limit,
    });

    let analyzed = 0;
    let ignored = 0;
    let errors = 0;

    for (const listing of listings) {
      try {
        const filter = await evaluateListing(listing.title, listing.description);
        if (filter.action !== "ALLOW") {
          await prisma.listing.update({ where: { id: listing.id }, data: { status: filter.action === "REJECT" ? "FILTERED" : "REVIEW_REQUIRED", filterFlags: filter.flags, filterReason: filter.reasons.join(" · ") } });
          ignored++;
          continue;
        }
        if (!looksLikePokemon(listing.title, listing.description)) {
          await prisma.listing.update({
            where: { id: listing.id },
            data: {
              status: "FILTERED",
              filterFlags: ["NOT_POKEMON"],
              filterReason: "Le titre et la description ne semblent pas concerner Pokémon",
            },
          });
          ignored++;
          continue;
        }

        for (const image of listing.images) {
          const items = await this.analyzeImageCached(image.id, image.url, {
            title: listing.title,
            description: listing.description ?? undefined,
          });

          for (const item of items) {
            const listingItem = await prisma.listingItem.create({
              data: {
                listingId: listing.id,
                label: item.label,
                confidenceScore: item.confidenceScore,
                imageQualityScore: item.imageQualityScore,
                counterfeitRiskScore: item.counterfeitRiskScore,
                needsManualReview: item.needsManualReview,
              },
            });

            const match = await this.matcher.match(item);
            if (match) {
              await prisma.productMatch.create({
                data: {
                  listingId: listing.id,
                  productId: match.cardmarketProductId,
                  confidence: match.confidence,
                },
              });
            }
            void listingItem; // conservé pour trace/debug, pas relié à ProductMatch directement en V1
          }
        }

        const risky = await prisma.listingItem.findFirst({ where: { listingId: listing.id, OR:[{counterfeitRiskScore:{gte:0.7}},{needsManualReview:true}] } });
        await prisma.listing.update({ where: { id: listing.id }, data: risky ? { status:"REVIEW_REQUIRED",filterFlags:["VISION_RISK"],filterReason:"Gemini signale un risque de contrefaçon ou demande une vérification manuelle" } : { status: "ANALYZED" } });
        analyzed++;
      } catch (err) {
        errors++;
        console.error(`Erreur d'analyse pour l'annonce ${listing.id}:`, err);
      }
    }

    return { analyzed, ignored, errors };
  }

  /**
   * Section 9 : "mettre les résultats en cache, ne pas analyser plusieurs
   * fois la même image inutilement." Le hash est calculé sur les octets
   * réels de l'image (dédoublonne aussi les republications avec la même
   * photo).
   */
  private async analyzeImageCached(
    listingImageId: string,
    imageUrl: string,
    context: { title?: string; description?: string }
  ): Promise<IdentifiedItem[]> {
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Image inaccessible: ${imageUrl}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const imageHash = createHash("sha256").update(buffer).digest("hex");

    const cached = await prisma.listingImage.findFirst({
      where: { imageHash, visionResultRaw: { not: Prisma.JsonNull } },
      select: { visionResultRaw: true },
    });

    let items: IdentifiedItem[];
    if (cached?.visionResultRaw) {
      items = (cached.visionResultRaw as unknown as { items: IdentifiedItem[] }).items;
    } else {
      const result = await this.visionProvider.analyzeImages([imageUrl], context);
      items = result.items;
      await prisma.listingImage.update({
        where: { id: listingImageId },
        data: { imageHash, analyzedAt: new Date(), visionResultRaw: result as never },
      });
      return items;
    }

    await prisma.listingImage.update({
      where: { id: listingImageId },
      data: { imageHash, analyzedAt: new Date() },
    });
    return items;
  }
}

// Exécution directe : npm run worker:listing-analyzer
if (require.main === module) {
  const requestedLimit = Number(process.argv[2] ?? 20);
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? requestedLimit : 20;
  runJob("listing-analyzer", () => new ListingAnalyzer().runOnce(limit))
    .then((result) => {
      console.log(
        `Analyse terminée : ${result.analyzed} annonces analysées, ${result.ignored} ignorées (filtre texte), ${result.errors} erreurs.`
      );
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
