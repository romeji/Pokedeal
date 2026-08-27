import { categorizeScore, type ScoreCategory } from "./category";

/**
 * Score 0-100 (section 14). Les facteurs listés dans le brief ne sont pas
 * tous disponibles avec des données réelles fiables en V1 :
 *  - liquidité (volume/fréquence des ventes) : NON disponible — le Price
 *    Guide Cardmarket ne fournit pas de volume de ventes (voir
 *    COMPLIANCE-cardmarket.md). `liquidityScore` reste `null`.
 *  - âge de l'annonce : disponible (Listing.firstSeenAt) mais pas encore
 *    câblé dans cette V1 du scorer — TODO.
 *  - confiance état (condition) : dépend de ce que Gemini retourne dans
 *    `condition`, pas encore transformé en score numérique — TODO.
 *
 * Plutôt que d'inventer ces signaux, le score se calcule sur une somme
 * pondérée des seuls facteurs réellement disponibles, normalisée sur leur
 * poids total (les poids des facteurs absents ne "gonflent" donc jamais
 * artificiellement les autres au-delà de leur poids relatif prévu).
 *
 * "Être conservateur : mieux vaut aucune alerte qu'une mauvaise alerte"
 * (section 14) — en cas de signal manquant important (confiance
 * identification ou fiabilité prix), le score est plafonné plutôt que
 * simplement recalculé sur le reste.
 */

export interface ScoringInput {
  discountPercent: number; // ex: -45 pour "45% moins cher que le marché"
  roi: number; // en %
  estimatedProfit: number; // en €
  identificationConfidence: number | null; // 0-1, moyenne des ProductMatch/ListingItem
  imageQualityScore: number | null; // 0-1
  counterfeitRiskScore: number | null; // 0-1 (plus haut = plus risqué)
  priceConfidence: number | null; // 0-1, depuis PriceEngine (fraîcheur/complétude)
  trendChangePercent: number | null; // évolution récente, null si historique insuffisant
}

export interface ScoringResult {
  score: number;
  category: ScoreCategory;
  confidenceScore: number; // 0-1
  riskScore: number; // 0-1
  liquidityScore: null; // toujours null en V1 — donnée non disponible, jamais inventée
  cappedForMissingSignals: boolean;
}

const WEIGHTS = {
  discount: 25,
  roi: 20,
  profit: 10,
  identificationConfidence: 20,
  imageQuality: 8,
  priceConfidence: 10,
  counterfeitRisk: 12, // inversé : faible risque = points élevés
  trend: 5,
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// discount négatif = bonne affaire ; -60% ou plus = score max
function normalizeDiscount(discountPercent: number): number {
  return clamp01(-discountPercent / 60);
}

function normalizeRoi(roi: number): number {
  return clamp01(roi / 100); // 100%+ ROI = score max
}

function normalizeProfit(profit: number): number {
  return clamp01(profit / 100); // 100€+ de profit = score max (V1, seuil arbitraire ajustable)
}

function normalizeTrend(changePercent: number): number {
  // une tendance à la hausse récente est un bonus modeste, une forte baisse pénalise légèrement
  return clamp01(0.5 + changePercent / 100);
}

export function scoreOpportunity(input: ScoringInput): ScoringResult {
  const factors: Array<{ weight: number; value: number }> = [
    { weight: WEIGHTS.discount, value: normalizeDiscount(input.discountPercent) },
    { weight: WEIGHTS.roi, value: normalizeRoi(input.roi) },
    { weight: WEIGHTS.profit, value: normalizeProfit(input.estimatedProfit) },
  ];

  let cappedForMissingSignals = false;

  if (input.identificationConfidence !== null) {
    factors.push({ weight: WEIGHTS.identificationConfidence, value: input.identificationConfidence });
  } else {
    cappedForMissingSignals = true;
  }

  if (input.imageQualityScore !== null) {
    factors.push({ weight: WEIGHTS.imageQuality, value: input.imageQualityScore });
  }

  if (input.priceConfidence !== null) {
    factors.push({ weight: WEIGHTS.priceConfidence, value: input.priceConfidence });
  } else {
    cappedForMissingSignals = true;
  }

  if (input.counterfeitRiskScore !== null) {
    factors.push({ weight: WEIGHTS.counterfeitRisk, value: 1 - input.counterfeitRiskScore });
  }

  if (input.trendChangePercent !== null) {
    factors.push({ weight: WEIGHTS.trend, value: normalizeTrend(input.trendChangePercent) });
  }

  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const weightedSum = factors.reduce((s, f) => s + f.weight * f.value, 0);
  let raw = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

  // Section 14 : mieux vaut aucune alerte qu'une mauvaise alerte — si un
  // signal de confiance clé manque, on plafonne pour éviter un score
  // artificiellement élevé basé uniquement sur prix/ROI.
  if (cappedForMissingSignals) raw = Math.min(raw, 69);

  const score = Math.round(raw);
  const riskScore = clamp01(
    (input.counterfeitRiskScore ?? 0.5) * 0.6 + (1 - (input.identificationConfidence ?? 0.5)) * 0.4
  );
  const confidenceScore = clamp01(
    ((input.identificationConfidence ?? 0.4) + (input.priceConfidence ?? 0.4)) / 2
  );

  return {
    score,
    category: categorizeScore(score),
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    riskScore: Math.round(riskScore * 100) / 100,
    liquidityScore: null,
    cappedForMissingSignals,
  };
}
