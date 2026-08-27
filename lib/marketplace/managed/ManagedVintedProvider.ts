import type {
  MarketplaceProvider,
  RawListing,
  SearchListingsParams,
} from "../types";
import { MarketplaceProviderError } from "../types";

/**
 * Stub pour un futur provider managé (ex: Apify, ScrapeBadger).
 * Non branché en Phase 1 — voir section 7 : "Managed = futur".
 */
export class ManagedVintedProvider implements MarketplaceProvider {
  readonly name = "vinted-managed";

  async searchListings(_params: SearchListingsParams): Promise<RawListing[]> {
    throw new MarketplaceProviderError(
      "INVALID_RESPONSE",
      "ManagedVintedProvider est un stub — aucun service géré n'est encore branché."
    );
  }

  async getListing(_externalId: string): Promise<RawListing | null> {
    throw new MarketplaceProviderError(
      "INVALID_RESPONSE",
      "ManagedVintedProvider est un stub — aucun service géré n'est encore branché."
    );
  }
}
