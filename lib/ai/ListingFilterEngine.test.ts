import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/database/prisma", () => ({ prisma: { listingFilter: { findMany: vi.fn().mockResolvedValue([]) } } }));
import { evaluateListing } from "./ListingFilterEngine";

describe("evaluateListing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it.each(["Mini Tin Pokémon vide", "Boîte seule sans cartes", "Empty ETB Pokémon"])("rejette un emballage sans contenu: %s", async (title) => {
    expect((await evaluateListing(title)).action).toBe("REJECT");
  });
  it("place un produit ouvert en revue", async () => {
    expect((await evaluateListing("Coffret Pokémon déjà ouvert")).action).toBe("REVIEW");
  });
});
