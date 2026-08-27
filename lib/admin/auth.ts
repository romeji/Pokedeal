import { timingSafeEqual } from "node:crypto";

export function isAdminRequest(request: Request): boolean {
  const expected = process.env.ADMIN_TOKEN;
  const supplied = request.headers.get("x-admin-token");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
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
