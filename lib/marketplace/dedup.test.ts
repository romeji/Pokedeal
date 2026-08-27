import { describe, expect, it } from "vitest";
import { computeListingHash, computeTitleHash } from "./dedup";

describe("listing deduplication", () => {
  it("normalise la casse, les accents et les espaces dans le titre", () => {
    expect(computeTitleHash("  Pokémon   151 ")).toBe(computeTitleHash("pokemon 151"));
  });

  it("détecte un changement de prix", () => {
    expect(computeListingHash("Pokémon 151", 55)).not.toBe(computeListingHash("Pokémon 151", 50));
  });
});
