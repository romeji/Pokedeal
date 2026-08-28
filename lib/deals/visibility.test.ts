import { describe, expect, it } from "vitest";
import { dealVerificationLabel, isActiveDealStatus } from "./visibility";

describe("deal visibility", () => {
  it("conserve les opportunités en vérification dans les deals actifs", () => {
    expect(isActiveDealStatus("REVIEW_REQUIRED", "NEW")).toBe(true);
    expect(dealVerificationLabel("REVIEW_REQUIRED")).toBe("À vérifier");
  });

  it("retire les annonces terminées ou les opportunités ignorées", () => {
    expect(isActiveDealStatus("REMOVED", "NEW")).toBe(false);
    expect(isActiveDealStatus("SCORED", "IGNORED")).toBe(false);
  });
});
