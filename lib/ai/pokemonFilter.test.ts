import { describe, expect, it } from "vitest";
import { looksLikePokemon } from "./pokemonFilter";

describe("looksLikePokemon", () => {
  it("reconnaît un titre Pokémon explicite", () => {
    expect(looksLikePokemon("Lot de cartes Pokémon 151")).toBe(true);
  });

  it("reconnaît une carte uniquement décrite par son numéro", () => {
    expect(looksLikePokemon("Aquali-V – 074/069")).toBe(true);
  });

  it("reconnaît le vocabulaire de rareté TCG", () => {
    expect(looksLikePokemon("Mienshao PAR 200 IR Full Art NM EN")).toBe(true);
  });

  it("rejette un objet sans signal Pokémon ou TCG", () => {
    expect(looksLikePokemon("Lot de chaussures enfant")).toBe(false);
  });
});
