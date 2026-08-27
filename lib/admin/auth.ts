import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "pokedeal_admin_session";

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createAdminSessionValue(secret: string): string {
  return createHash("sha256").update(`pokedeal-admin:${secret}`).digest("hex");
}

export function isAdminTokenValid(supplied: string | null): boolean {
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(expected && supplied && safeEqual(expected, supplied));
}

export function isAdminRequest(request: Request): boolean {
  const expected = process.env.ADMIN_TOKEN;
  const supplied = request.headers.get("x-admin-token");
  if (!expected) return false;
  if (supplied && safeEqual(expected, supplied)) return true;

  const cookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((value) => value.trim().split("=", 2))
    .find(([name]) => name === ADMIN_SESSION_COOKIE)?.[1];
  return Boolean(cookie && safeEqual(createAdminSessionValue(expected), cookie));
}

export function isVintrackRequest(request: Request): boolean {
  if (process.env.VINTED_REALTIME_ENABLED !== "true") return false;
  const expected = process.env.VINTRACK_INGEST_TOKEN;
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
