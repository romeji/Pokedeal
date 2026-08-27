import { afterEach, describe, expect, it } from "vitest";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionValue,
  isAdminRequest,
  isAdminTokenValid,
} from "./auth";

const previousToken = process.env.ADMIN_TOKEN;

afterEach(() => {
  if (previousToken === undefined) delete process.env.ADMIN_TOKEN;
  else process.env.ADMIN_TOKEN = previousToken;
});

describe("admin auth", () => {
  it("accepte la clé directe et refuse une mauvaise clé", () => {
    process.env.ADMIN_TOKEN = "secret-test";
    expect(isAdminTokenValid("secret-test")).toBe(true);
    expect(isAdminTokenValid("incorrect")).toBe(false);
  });

  it("accepte la session HTTP-only dérivée", () => {
    process.env.ADMIN_TOKEN = "secret-test";
    const request = new Request("https://pokedeal.test/api/items", {
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE}=${createAdminSessionValue("secret-test")}`,
      },
    });
    expect(isAdminRequest(request)).toBe(true);
  });
});
