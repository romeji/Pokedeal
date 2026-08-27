import { describe, expect, it } from "vitest";
import {
  assertOfficialCardmarketDownloadUrl,
  validateCardmarketPayload,
} from "./officialDownloads";

describe("Cardmarket official downloads", () => {
  it("accepte uniquement le domaine de téléchargement officiel en HTTPS", () => {
    expect(() =>
      assertOfficialCardmarketDownloadUrl(
        "https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_6.json"
      )
    ).not.toThrow();
    expect(() =>
      assertOfficialCardmarketDownloadUrl("https://example.com/price_guide_6.json")
    ).toThrow(/non officiel/);
  });

  it("valide les métadonnées et la collection attendue", () => {
    expect(
      validateCardmarketPayload(
        { version: 1, createdAt: "2026-08-27T12:20:28+0200", priceGuides: [{}] },
        "priceGuides"
      )
    ).toEqual({ createdAt: "2026-08-27T12:20:28+0200", entries: 1 });
  });

  it("refuse un JSON vide ou d'une version inconnue", () => {
    expect(() =>
      validateCardmarketPayload(
        { version: 2, createdAt: "2026-08-27T12:20:28+0200", products: [] },
        "products"
      )
    ).toThrow(/version\/createdAt/);
  });
});
