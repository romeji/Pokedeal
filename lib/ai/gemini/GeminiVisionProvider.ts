import type { VisionProvider, VisionAnalysisResult, IdentifiedItem } from "../types";

/**
 * Implémentation réelle Gemini Vision (Phase 4).
 *
 * Endpoint REST officiel documenté par Google
 * (https://ai.google.dev/gemini-api/docs/structured-output) :
 *   POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 * avec `generationConfig.responseMimeType: "application/json"` et un
 * `responseSchema` pour forcer une sortie JSON structurée.
 *
 * ⚠️ Le nom exact du modèle "gratuit" bouge vite chez Google (plusieurs
 * générations Flash sont sorties/dépréciées rien qu'en 2026). On ne fige
 * donc PAS un modèle en dur ici : GEMINI_MODEL est obligatoire en env, et
 * la valeur doit être vérifiée dans Google AI Studio → Quotas au moment
 * où tu déploies (voir .env.example).
 *
 * Limites assumées et documentées plutôt que cachées :
 *  - `counterfeitRiskScore` est une estimation du modèle à partir d'une
 *    photo, PAS une expertise fiable d'authentification. À traiter comme
 *    un signal faible parmi d'autres, jamais comme une certitude.
 *  - Aucune clé API en dur, tout vient de l'environnement.
 */
export class GeminiVisionProvider implements VisionProvider {
  readonly name = "gemini-vision";

  constructor(
    private readonly apiKey = process.env.GEMINI_API_KEY,
    private readonly model = process.env.GEMINI_MODEL
  ) {}

  async analyzeImages(
    imageUrls: string[],
    context?: { title?: string; description?: string }
  ): Promise<VisionAnalysisResult> {
    if (!this.apiKey) throw new Error("GEMINI_API_KEY non configuré.");
    if (!this.model) {
      throw new Error(
        "GEMINI_MODEL non configuré — choisis un modèle Flash actuel dans Google AI Studio et mets-le dans .env (voir commentaire dans .env.example)."
      );
    }
    if (imageUrls.length === 0) return { items: [] };

    const imageParts = await Promise.all(imageUrls.map((url) => this.fetchImageAsPart(url)));

    const prompt = this.buildPrompt(context);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }, ...imageParts],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Gemini a répondu ${res.status}: ${body.slice(0, 500)}`);
    }

    const data = (await res.json()) as GeminiGenerateContentResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Réponse Gemini vide ou inattendue.");

    let parsed: { items: IdentifiedItem[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("La sortie Gemini n'était pas un JSON valide malgré responseSchema.");
    }

    return { items: parsed.items ?? [] };
  }

  private buildPrompt(context?: { title?: string; description?: string }): string {
    return [
      "Tu identifies des produits Pokémon TCG (cartes, ETB, displays, boosters, tins, coffrets...) à partir de photos d'une annonce de seconde main.",
      "Pour chaque élément visible distinct, retourne un objet avec : label, productType, setCode, setName, number, language, rarity, edition, condition, confidenceScore (0-1), imageQualityScore (0-1), counterfeitRiskScore (0-1, estimation prudente), needsManualReview (true si confidenceScore < 0.6 ou si un doute sérieux existe).",
      "Si un champ n'est pas identifiable avec certitude sur la photo, mets-le à null plutôt que de deviner.",
      "S'il y a plusieurs cartes/produits visibles dans un lot, retourne un élément par produit distinct.",
      context?.title ? `Titre de l'annonce : ${context.title}` : "",
      context?.description ? `Description de l'annonce : ${context.description}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  private async fetchImageAsPart(url: string): Promise<{ inline_data: { mime_type: string; data: string } }> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Impossible de récupérer l'image ${url} (${res.status})`);
    const mimeType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    return { inline_data: { mime_type: mimeType, data: buffer.toString("base64") } };
  }
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          productType: {
            type: "string",
            enum: [
              "CARD",
              "BOOSTER",
              "DISPLAY",
              "ELITE_TRAINER_BOX",
              "THEME_DECK",
              "BOX_SET",
              "TIN",
              "BLISTER",
              "COIN",
              "TRAINER_KIT",
              "OTHER",
            ],
          },
          setCode: { type: ["string", "null"] },
          setName: { type: ["string", "null"] },
          number: { type: ["string", "null"] },
          language: { type: ["string", "null"] },
          rarity: { type: ["string", "null"] },
          edition: { type: ["string", "null"] },
          condition: { type: ["string", "null"] },
          confidenceScore: { type: "number" },
          imageQualityScore: { type: "number" },
          counterfeitRiskScore: { type: "number" },
          needsManualReview: { type: "boolean" },
        },
        required: [
          "label",
          "productType",
          "confidenceScore",
          "imageQualityScore",
          "counterfeitRiskScore",
          "needsManualReview",
        ],
      },
    },
  },
  required: ["items"],
};
