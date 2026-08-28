import { prisma } from "@/lib/database/prisma";
import type { IdentifiedItem } from "@/lib/ai/types";
import { searchCardsDetailed } from "@/lib/tcgdex/client";

/**
 * ProductMatcher (section 11) — associe un IdentifiedItem (sortie Gemini)
 * à un CardmarketProduct existant en base.
 *
 * Approche volontairement simple pour la V1 (pas de service payant, pas
 * de librairie de fuzzy-matching externe) : score de similarité par
 * recouvrement de tokens (Jaccard) sur le nom normalisé, avec un bonus si
 * le productType concorde avec le `kind` Cardmarket. C'est un matching
 * "raisonnable", pas garanti — un matching incertain (confidence basse)
 * ne doit jamais déclencher une alerte forte (section 11, dernière ligne).
 */

export interface MatchResult {
  cardmarketProductId: string; // notre id interne (CardmarketProduct.id), pas idProduct Cardmarket
  confidence: number; // 0-1
}

const PRODUCT_TYPE_TO_KIND: Record<IdentifiedItem["productType"], string> = {
  CARD: "SINGLE",
  BOOSTER: "BOOSTER",
  DISPLAY: "DISPLAY",
  ELITE_TRAINER_BOX: "ELITE_TRAINER_BOX",
  THEME_DECK: "THEME_DECK",
  BOX_SET: "BOX_SET",
  TIN: "TIN",
  BLISTER: "BLISTER",
  COIN: "COIN",
  TRAINER_KIT: "TRAINER_KIT",
  OTHER: "OTHER",
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): Set<string> {
  return new Set(normalize(text).split(" ").filter((t) => t.length > 1));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export class ProductMatcher {
  /**
   * Retourne le meilleur candidat trouvé en base, ou null si rien de
   * suffisamment proche (< MIN_CONFIDENCE). Ne matche que dans le `kind`
   * attendu quand il est connu, pour éviter de confondre par exemple un
   * ETB et un simple booster du même set.
   */
  async match(item: IdentifiedItem, minConfidence = 0.35): Promise<MatchResult | null> {
    const kind = PRODUCT_TYPE_TO_KIND[item.productType];
    const queryTokens = tokenize(item.label);
    const primaryLabel = (item.label.split(/\s+-\s+|\[/, 1)[0]?.trim() ?? item.label)
      .replace(/^pok[eé]mon(?:\s+tcg)?\s+/i, "")
      .trim();

    // Une carte existe dans de nombreuses impressions à des prix très différents.
    // Sans numéro + série, un nom seul n'est jamais assez sûr pour une alerte.
    if (item.productType === "CARD") {
      if (!item.number || (!item.setCode && !item.setName)) return null;
      const cards = await searchCardsDetailed(primaryLabel, 40);
      const wantedNumber = normalizeCardNumber(item.number);
      const wantedSet = normalize(item.setCode ?? item.setName ?? "");
      const exact = cards.find((card) => {
        if (normalizeCardNumber(card.localId) !== wantedNumber) return false;
        const cardSet = normalize(`${card.set.id} ${card.set.name}`);
        return wantedSet.split(" ").filter((token) => token.length > 1).every((token) => cardSet.includes(token));
      });
      const idProduct = exact?.pricing?.cardmarket?.idProduct;
      if (!idProduct) return null;
      const product = await prisma.cardmarketProduct.findUnique({ where: { cardmarketProductId: idProduct }, select: { id: true } });
      if (!product) return null;
      return { cardmarketProductId: product.id, confidence: Math.round(Math.min(0.98, item.confidenceScore) * 100) / 100 };
    }

    let candidates = await prisma.cardmarketProduct.findMany({
      where: {
        ...(kind !== "OTHER" ? { kind: kind as never } : {}),
        name: { contains: primaryLabel, mode: "insensitive" },
      },
      select: { id: true, name: true },
      take: 500,
    });

    // Certains libellés Gemini sont trop descriptifs pour un `contains`.
    // On retombe alors sur un échantillon du bon type, sans scanner 78k lignes.
    if (candidates.length === 0) {
      candidates = await prisma.cardmarketProduct.findMany({
        where: kind !== "OTHER" ? { kind: kind as never } : undefined,
        select: { id: true, name: true },
        take: 5000,
      });
    }

    let best: { id: string; score: number } | null = null;
    for (const candidate of candidates) {
      const candidateName = normalize(candidate.name);
      const primaryName = normalize(primaryLabel);
      const nameBonus =
        primaryName.length >= 3 &&
        (candidateName === primaryName || candidateName.startsWith(`${primaryName} `))
          ? 0.3
          : 0;
      const score = Math.min(1, jaccard(queryTokens, tokenize(candidate.name)) + nameBonus);
      if (!best || score > best.score) best = { id: candidate.id, score };
    }

    // Le catalogue Cardmarket ne contient pas le numéro de carte. Pour une
    // single, on exige donc une confiance supérieure afin d'éviter de prendre
    // le prix d'une autre impression portant le même nom.
    const requiredConfidence = Math.max(minConfidence, 0.6);
    if (!best || best.score < requiredConfidence) return null;
    return { cardmarketProductId: best.id, confidence: Math.round(Math.min(best.score, item.confidenceScore) * 100) / 100 };
  }
}

function normalizeCardNumber(value: string) {
  const first = value.split("/")[0]?.replace(/\D/g, "") ?? "";
  return String(Number(first || "0"));
}
