import { describe, expect, it } from "vitest";
import { getDatabaseDeployment } from "./deployment";

describe("database deployment", () => {
  it("détecte PostgreSQL local", () => {
    expect(getDatabaseDeployment("postgresql://pds:pds@localhost:5432/pokedeal")).toBe("LOCAL");
    expect(getDatabaseDeployment("postgresql://pds:pds@db:5432/pokedeal")).toBe("LOCAL");
  });

  it("détecte PostgreSQL cloud sans exposer son URL", () => {
    expect(getDatabaseDeployment("postgresql://user:secret@ep-example.eu.neon.tech/pokedeal")).toBe(
      "CLOUD_SHARED"
    );
  });

  it("refuse une configuration absente ou invalide", () => {
    expect(getDatabaseDeployment(undefined)).toBe("UNCONFIGURED");
    expect(getDatabaseDeployment("not-a-url")).toBe("UNCONFIGURED");
  });
});
