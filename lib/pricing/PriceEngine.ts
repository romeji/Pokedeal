import { prisma } from "@/lib/database/prisma";
import type { PriceProvider, PriceResult } from "./types";

/**
 * PriceEngine — Cardmarket comme source principale (section 4).
 *
 * Honnêteté sur les limites réelles des données disponibles (voir
 * COMPLIANCE-cardmarket.md) :
 *  - Le Price Guide Cardmarket ne fournit PAS de "nombre d'annonces
 *    échantillonnées" — donc `sampleSize` reste `null` : on n'invente pas
 *    un chiffre que la source ne donne pas.
 *  - `confidence` est donc une heuristique basée sur la fraîcheur et la
 *    complétude du dernier snapshot, PAS une vraie mesure statistique.
 *  - L'évolution 7/30/90 jours (section 4) nécessite plusieurs imports du
 *    Price Guide espacés dans le temps (idéalement quotidiens, comme
 *    Cardmarket met à jour son propre Price Guide). Tant que l'historique
 *    n'a pas assez de recul, ces valeurs restent `null` plutôt que d'être
 *    approximées sur une seule journée de données.
 */
export class PriceEngine implements PriceProvider {
  readonly name = "cardmarket-price-engine";

  /** Implémente PriceProvider — prend un idProduct Cardmarket (string). */
  async getProductPrice(cardmarketProductId: string): Promise<PriceResult | null> {
    const product = await prisma.cardmarketProduct.findUnique({
      where: { cardmarketProductId: Number(cardmarketProductId) },
    });
    if (!product) return null;

    const latest = await prisma.priceSnapshot.findFirst({
      where: { productId: product.id },
      orderBy: { retrievedAt: "desc" },
    });
    if (!latest) return null;

    const price = this.pickCanonicalPrice(latest);
    if (price === null) return null;

    return {
      price,
      currency: latest.currency,
      source: "cardmarket",
      confidence: this.estimateConfidence(latest),
      sampleSize: null, // non fourni par le Price Guide — jamais inventé
      retrievedAt: latest.retrievedAt,
    };
  }

  /**
   * Valeurs optimiste / probable / prudente pour une annonce donnée
   * (utilisées par l'Opportunity Engine, section 12-13). Dérivées des
   * champs réels low/avg/trend du Price Guide — pas de nombre inventé.
   */
  async getMarketValueRange(
    cardmarketProductId: string
  ): Promise<{ optimisticValue: number; probableValue: number; conservativeValue: number; retrievedAt: Date } | null> {
    const product = await prisma.cardmarketProduct.findUnique({
      where: { cardmarketProductId: Number(cardmarketProductId) },
    });
    if (!product) return null;

    const latest = await prisma.priceSnapshot.findFirst({
      where: { productId: product.id },
      orderBy: { retrievedAt: "desc" },
    });
    if (!latest) return null;

    const low = latest.lowPrice ? Number(latest.lowPrice) : null;
    const avg = latest.averagePrice ? Number(latest.averagePrice) : null;
    const trend = latest.trendPrice ? Number(latest.trendPrice) : null;

    // conservativeValue : le plus bas disponible parmi low/avg (jamais le trend,
    // qui peut être gonflé par une hausse récente ponctuelle).
    // probableValue : avg si dispo, sinon trend.
    // optimisticValue : le plus élevé parmi trend/avg.
    const candidates = [low, avg, trend].filter((v): v is number => v !== null);
    if (candidates.length === 0) return null;

    // Bug évité : si low/avg sont absents mais trend présent, replier sur
    // trend plutôt que Math.min() sur un tableau vide (= Infinity).
    const lowAvg = [low, avg].filter((v): v is number => v !== null);
    const conservativeValue = lowAvg.length > 0 ? Math.min(...lowAvg) : candidates[0];
    const probableValue = avg ?? trend ?? conservativeValue;
    const optimisticValue = Math.max(...candidates);

    return { optimisticValue, probableValue, conservativeValue, retrievedAt: latest.retrievedAt };
  }

  /**
   * Évolution du prix sur une fenêtre donnée, calculée à partir de
   * l'historique réel de PriceSnapshot (jamais simulée). Retourne `null`
   * si on n'a pas encore deux imports assez espacés dans cette fenêtre.
   */
  async getPriceEvolution(
    cardmarketProductId: string,
    windowDays: 7 | 30 | 90
  ): Promise<{ changePercent: number; fromPrice: number; toPrice: number } | null> {
    const product = await prisma.cardmarketProduct.findUnique({
      where: { cardmarketProductId: Number(cardmarketProductId) },
    });
    if (!product) return null;

    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const [oldest, newest] = await Promise.all([
      prisma.priceSnapshot.findFirst({
        where: { productId: product.id, retrievedAt: { gte: since } },
        orderBy: { retrievedAt: "asc" },
      }),
      prisma.priceSnapshot.findFirst({
        where: { productId: product.id },
        orderBy: { retrievedAt: "desc" },
      }),
    ]);

    if (!oldest || !newest || oldest.id === newest.id) return null;

    const fromPrice = this.pickCanonicalPrice(oldest);
    const toPrice = this.pickCanonicalPrice(newest);
    if (fromPrice === null || toPrice === null || fromPrice === 0) return null;

    return {
      changePercent: Math.round(((toPrice - fromPrice) / fromPrice) * 1000) / 10,
      fromPrice,
      toPrice,
    };
  }

  private pickCanonicalPrice(snapshot: {
    trendPrice: unknown;
    averagePrice: unknown;
    lowPrice: unknown;
  }): number | null {
    const trend = snapshot.trendPrice !== null ? Number(snapshot.trendPrice) : null;
    const avg = snapshot.averagePrice !== null ? Number(snapshot.averagePrice) : null;
    const low = snapshot.lowPrice !== null ? Number(snapshot.lowPrice) : null;
    return trend ?? avg ?? low;
  }

  /**
   * Heuristique de confiance (0-1), PAS une statistique réelle :
   * +0.5 de base, +0.3 si low/avg/trend sont tous présents (cohérence),
   * +0.2 si le snapshot a moins de 48h.
   */
  private estimateConfidence(snapshot: {
    retrievedAt: Date;
    lowPrice: unknown;
    averagePrice: unknown;
    trendPrice: unknown;
  }): number {
    let confidence = 0.5;
    if (snapshot.lowPrice !== null && snapshot.averagePrice !== null && snapshot.trendPrice !== null) {
      confidence += 0.3;
    }
    const ageHours = (Date.now() - snapshot.retrievedAt.getTime()) / (1000 * 60 * 60);
    if (ageHours < 48) confidence += 0.2;
    return Math.min(1, Math.round(confidence * 100) / 100);
  }
}
