import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestUser } from "@/lib/auth/user";
import { prisma } from "@/lib/database/prisma";

const input = z.object({
  locale: z.enum(["fr", "en", "de", "es", "it"]),
  currency: z.enum(["EUR", "USD", "GBP", "CHF"]),
  trainerName: z.string().trim().min(2).max(40),
  favoritePokemon: z.string().trim().min(2).max(60),
  birthDate: z.string().date(),
});

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user || user.provider !== "google") return NextResponse.json({ error: "Connexion Google requise" }, { status: 401 });
  const profile = await prisma.user.findUnique({ where: { id: user.id }, select: { locale: true, currency: true, trainerName: true, favoritePokemon: true, birthDate: true, onboardingCompletedAt: true } });
  return NextResponse.json(profile);
}

export async function PUT(request: Request) {
  const user = await getRequestUser(request);
  if (!user || user.provider !== "google") return NextResponse.json({ error: "Connexion Google requise" }, { status: 401 });
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Complète correctement les trois étapes." }, { status: 400 });
  const profile = await prisma.user.update({ where: { id: user.id }, data: { ...parsed.data, birthDate: new Date(`${parsed.data.birthDate}T00:00:00.000Z`), onboardingCompletedAt: new Date() } });
  return NextResponse.json({ saved: true, trainerName: profile.trainerName });
}
