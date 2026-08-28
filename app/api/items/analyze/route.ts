import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/user";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!await getRequestUser(request)) return NextResponse.json({ error: "Connexion requise" }, { status: 401 });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Gemini n’est pas configuré" }, { status: 503 });
  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > 5_000_000) return NextResponse.json({ error: "Image JPG/PNG/WebP de 5 Mo maximum requise" }, { status: 400 });
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({ contents: [{ parts: [{ text: "Identifie précisément cette carte ou cet item Pokémon. Réponds uniquement en JSON avec name, productType, setName, number et confidence. N’invente pas les champs illisibles; utilise null." }, { inlineData: { mimeType: file.type, data: base64 } }] }], generationConfig: { responseMimeType: "application/json", responseJsonSchema: { type: "object", properties: { name: { type: ["string", "null"] }, productType: { type: ["string", "null"] }, setName: { type: ["string", "null"] }, number: { type: ["string", "null"] }, confidence: { type: "number" } }, required: ["name", "productType", "setName", "number", "confidence"] } } }),
  });
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
  if (!response.ok) return NextResponse.json({ error: payload.error?.message || `Gemini HTTP ${response.status}` }, { status: 502 });
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return NextResponse.json({ error: "Gemini n’a pas identifié le produit" }, { status: 422 });
  const analysis = JSON.parse(text) as { name: string | null; productType: string | null; setName: string | null; number: string | null; confidence: number };
  const query = [analysis.name, analysis.setName, analysis.number].filter(Boolean).join(" ");
  return NextResponse.json({ analysis, query });
}
