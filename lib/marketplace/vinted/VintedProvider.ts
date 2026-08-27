import type {
  MarketplaceProvider,
  RawListing,
  SearchListingsParams,
} from "../types";
import { MarketplaceProviderError } from "../types";
import { assertProviderApproved } from "@/lib/compliance/complianceGate";

/**
 * Provider Vinted réel — NON IMPLÉMENTÉ en Phase 1.
 *
 * TODO — INFORMATION À VÉRIFIER avant toute implémentation (section 6) :
 *  - méthode d'accès actuelle (existe-t-il une API officielle publique ?)
 *  - conditions d'utilisation de Vinted
 *  - licences des projets étudiés (vinted-sniper, vinted-api-kit, GoupixDex)
 *  - confirmation qu'aucun contournement de CAPTCHA / auth / anti-bot n'est requis
 *
 * Tant que `ProviderComplianceReview.status` pour "vinted" n'est pas
 * APPROVED, ce provider doit refuser de s'exécuter (voir section 24).
 * Utiliser MockVintedProvider pour le développement en attendant.
 */
export class VintedProvider implements MarketplaceProvider {
  readonly name = "vinted";

  async searchListings(_params: SearchListingsParams): Promise<RawListing[]> {
    await assertProviderApproved("vinted");
    throw new MarketplaceProviderError(
      "INVALID_RESPONSE",
      "VintedProvider n'est pas encore implémenté (TODO — INFORMATION À VÉRIFIER, voir section 6 du brief)."
    );
  }

  async getListing(_externalId: string): Promise<RawListing | null> {
    await assertProviderApproved("vinted");
    throw new MarketplaceProviderError(
      "INVALID_RESPONSE",
      "VintedProvider n'est pas encore implémenté (TODO — INFORMATION À VÉRIFIER, voir section 6 du brief)."
    );
  }
}
