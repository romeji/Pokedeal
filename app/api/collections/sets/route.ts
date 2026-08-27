import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin/auth";
import { assetLogo, listSets } from "@/lib/tcgdex/client";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim().toLocaleLowerCase("fr") ?? "";
  const sets = await listSets("fr");
  return NextResponse.json(
    sets
      .filter((set) => !query || set.name.toLocaleLowerCase("fr").includes(query))
      .reverse()
      .slice(0, 80)
      .map((set) => ({ ...set, logo: assetLogo(set.logo) })),
  );
}
