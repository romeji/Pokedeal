import type {
  MarketplaceProvider,
  RawListing,
  SearchListingsParams,
} from "../types";

// Petites images PNG autonomes : le mock reste sans réseau et l'analyseur
// peut calculer un vrai hash avant de déléguer au VisionProvider.
const MOCK_IMAGE_ETB_FR =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAWSURBVChTYzijZPwfH2ZAF0DHw0MBAA/iiAEJ28yJAAAAAElFTkSuQmCC";
const MOCK_IMAGE_ETB_JP =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAWSURBVChTY1BKO/MfH2ZAF0DHw0MBAFjclMHdFrUGAAAAAElFTkSuQmCC";
const MOCK_IMAGE_BLURRY =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAWSURBVChTYygvL/+PDzOgC6Dj4aEAALaamQGYCuuMAAAAAElFTkSuQmCC";

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
      imageUrls: [MOCK_IMAGE_ETB_FR],
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
      imageUrls: [MOCK_IMAGE_ETB_JP],
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
      imageUrls: [MOCK_IMAGE_BLURRY],
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
