import { createHash } from "node:crypto";

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** Détecte une éventuelle republication à titre/prix identique. */
export function computeTitleHash(title: string): string {
  return sha256(normalize(title));
}

/** Détecte un changement de prix sur une annonce par ailleurs identique. */
export function computeListingHash(title: string, price: number): string {
  return sha256(`${normalize(title)}::${price}`);
}
