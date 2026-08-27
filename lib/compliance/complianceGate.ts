import { prisma } from "@/lib/database/prisma";

/**
 * Garde-fou obligatoire (section 24) : un provider dont la review de
 * conformité n'est pas APPROVED ne doit jamais s'exécuter contre un
 * vrai service externe. "Vinted" reste REVIEW_REQUIRED par défaut
 * tant que la méthode d'accès n'a pas été vérifiée.
 */
export async function assertProviderApproved(provider: string): Promise<void> {
  const review = await prisma.providerComplianceReview.findUnique({
    where: { provider },
  });

  if (!review || review.status !== "APPROVED") {
    throw new Error(
      `Provider "${provider}" bloqué : statut de conformité = ${review?.status ?? "AUCUNE REVIEW"}. ` +
        `Voir ProviderComplianceReview / section 24 du brief.`
    );
  }
}
