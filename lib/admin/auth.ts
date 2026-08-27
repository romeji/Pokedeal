import { timingSafeEqual } from "node:crypto";

export function isAdminRequest(request: Request): boolean {
  const expected = process.env.ADMIN_TOKEN;
  const supplied = request.headers.get("x-admin-token");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}
