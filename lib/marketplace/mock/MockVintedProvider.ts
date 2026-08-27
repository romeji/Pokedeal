import type {
  MarketplaceProvider,
  RawListing,
  SearchListingsParams,
} from "../types";

/**
 * Provider de test — aucune requête réseau.
 * Sert au test end-to-end (section 27) et au développement des phases
 * 3 à 5 avant que le VintedProvider réel ne soit activé (section 6-7).
 */
export class MockVintedProvider implements MarketplaceProvider {
  readonly name = "vinted-mock";

  private readonly fixtures: RawListing[] = [
    {
      marketplace: "vinted",
      externalId: "mock-151-etb-fr-01",
      url: "https://www.vinted.fr/mock/151-etb-fr-01",
      title: "Pokémon 151 ETB française",
      description: "Elite Trainer Box scellée, jamais ouverte.",
      price: 55,
      currency: "EUR",
      imageUrls: ["https://example.local/mock/151-etb-fr-01-1.jpg"],
      postedAt: new Date(),
    },
    {
      marketplace: "vinted",
      externalId: "mock-151-etb-jp-01",
      url: "https://www.vinted.fr/mock/151-etb-jp-01",
      title: "Pokemon 151 ETB japonaise",
      description: "Version japonaise, scellée.",
      price: 45,
      currency: "EUR",
      imageUrls: ["https://example.local/mock/151-etb-jp-01-1.jpg"],
      postedAt: new Date(),
    },
    {
      marketplace: "vinted",
      externalId: "mock-photo-illisible-01",
      url: "https://www.vinted.fr/mock/photo-illisible-01",
      title: "Lot cartes pokemon",
      description: "Voir photo",
      price: 20,
      currency: "EUR",
      imageUrls: ["https://example.local/mock/blurry.jpg"],
      postedAt: new Date(),
    },
  ];

  async searchListings(params: SearchListingsParams): Promise<RawListing[]> {
    const q = params.query.toLowerCase();
    return this.fixtures
      .filter((f) => f.title.toLowerCase().includes(q) || q === "")
      .slice(0, params.maxResults ?? this.fixtures.length);
  }

  async getListing(externalId: string): Promise<RawListing | null> {
    return this.fixtures.find((f) => f.externalId === externalId) ?? null;
  }
}
