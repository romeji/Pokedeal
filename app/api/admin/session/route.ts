import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  createAdminSessionValue,
  isAdminRequest,
  isAdminTokenValid,
} from "@/lib/admin/auth";
import { getRequestUser, googleAuthConfigured } from "@/lib/auth/user";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  return NextResponse.json({ authenticated: Boolean(user), user, googleAuthConfigured });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string };
  if (!isAdminTokenValid(body.token ?? null)) {
    return NextResponse.json({ error: "Clé incorrecte" }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true, user: { id: "legacy-admin", name: "Propriétaire PokéDeal", role: "ADMIN", provider: "admin" } });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: createAdminSessionValue(body.token ?? ""),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
