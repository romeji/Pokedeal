// Contrat que TOUT provider marketplace doit respecter.
// Le cœur de l'application ne doit jamais importer directement
// un provider concret (Vinted, futur eBay/Leboncoin...) — seulement ce type.

export interface RawListing {
  marketplace: string;
  externalId: string;
  url: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  imageUrls: string[];
  postedAt: Date | null;
}

export interface SearchListingsParams {
  query: string;
  maxResults?: number;
  minPrice?: number;
  maxPrice?: number;
}

export type MarketplaceErrorCode =
  | "UNAUTHORIZED" // 401
  | "FORBIDDEN" // 403
  | "RATE_LIMITED" // 429
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "INVALID_RESPONSE";

export class MarketplaceProviderError extends Error {
  constructor(
    public readonly code: MarketplaceErrorCode,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "MarketplaceProviderError";
  }
}

export interface MarketplaceProvider {
  readonly name: string;

  /**
   * Doit gérer proprement 401/403/429/timeout/erreurs réseau
   * en levant un MarketplaceProviderError plutôt que de crasher.
   * Le reste de l'application doit pouvoir continuer si ce provider tombe.
   */
  searchListings(params: SearchListingsParams): Promise<RawListing[]>;

  getListing(externalId: string): Promise<RawListing | null>;
}
