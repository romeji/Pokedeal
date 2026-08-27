import { prisma } from "@/lib/database/prisma";
import type { IdentifiedItem } from "@/lib/ai/types";

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

    const candidates = await prisma.cardmarketProduct.findMany({
      where: kind !== "OTHER" ? { kind: kind as never } : undefined,
      select: { id: true, name: true },
      take: 5000, // V1 : scan en mémoire — à remplacer par une recherche indexée si ça devient trop lent
    });

    let best: { id: string; score: number } | null = null;
    for (const candidate of candidates) {
      const score = jaccard(queryTokens, tokenize(candidate.name));
      if (!best || score > best.score) best = { id: candidate.id, score };
    }

    if (!best || best.score < minConfidence) return null;
    return { cardmarketProductId: best.id, confidence: Math.round(best.score * 100) / 100 };
  }
}
