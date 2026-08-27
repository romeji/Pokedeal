import type { VisionProvider, VisionAnalysisResult, IdentifiedItem } from "../types";

/**
 * Implémentation réelle Gemini Vision (Phase 4).
 *
 * Endpoint REST officiel documenté par Google
 * (https://ai.google.dev/gemini-api/docs/structured-output) :
 *   POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 * avec `generationConfig.responseMimeType: "application/json"` et un
 * `responseJsonSchema` pour forcer une sortie JSON structurée.
 *
 * Le modèle reste surchargeable par GEMINI_MODEL. Le défaut est une version
 * Flash-Lite stable, multimodale et disponible sur le free tier au moment de
 * cette implémentation. Il faut continuer à surveiller les dépréciations
 * officielles Google.
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
    private readonly model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"
  ) {}

  async analyzeImages(
    imageUrls: string[],
    context?: { title?: string; description?: string }
  ): Promise<VisionAnalysisResult> {
    if (!this.apiKey) throw new Error("GEMINI_API_KEY non configuré.");
    if (imageUrls.length === 0) return { items: [] };

    const imageParts = await Promise.all(imageUrls.map((url) => this.fetchImageAsPart(url)));

    const prompt = this.buildPrompt(context);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    const requestBody = JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }, ...imageParts],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
      },
    });
    const res = await this.requestWithQuotaRetry(url, requestBody);

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

  private async requestWithQuotaRetry(url: string, body: string): Promise<Response> {
    for (let attempt = 0; attempt < 3; attempt++) {
      await waitForGeminiSlot();
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey! },
        body,
      });
      if (response.ok) return response;

      const responseBody = await response.text().catch(() => "");
      if (response.status !== 429 || attempt === 2) {
        throw new Error(`Gemini a répondu ${response.status}: ${responseBody.slice(0, 500)}`);
      }
      const headerDelay = Number(response.headers.get("retry-after"));
      const messageDelay = Number(responseBody.match(/retry in ([\d.]+)s/i)?.[1]);
      const retryMs = Math.ceil(
        (Number.isFinite(headerDelay) ? headerDelay * 1_000 :
          Number.isFinite(messageDelay) ? messageDelay * 1_000 : 6_000) + 750,
      );
      await delay(retryMs);
    }
    throw new Error("Gemini indisponible après les nouvelles tentatives.");
  }

  private buildPrompt(context?: { title?: string; description?: string }): string {
    return [
      "Tu identifies des produits Pokémon TCG (cartes, ETB, displays, boosters, tins, coffrets...) à partir de photos d'une annonce de seconde main.",
      "Pour chaque élément visible distinct, retourne un objet avec : label, productType, setCode, setName, number, language, rarity, edition, condition, confidenceScore (0-1), imageQualityScore (0-1), counterfeitRiskScore (0-1, estimation prudente), needsManualReview (true si confidenceScore < 0.6 ou si un doute sérieux existe).",
      "Le champ label doit utiliser le nom canonique anglais du produit tel qu'il apparaît généralement dans le catalogue Cardmarket, même si l'annonce est en français, allemand, italien ou japonais. Conserve setName, number et language dans leurs champs séparés.",
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

const minimumRequestIntervalMs = Math.max(
  4_000,
  Number(process.env.GEMINI_MIN_REQUEST_INTERVAL_MS ?? 5_000) || 5_000,
);
let nextGeminiRequestAt = 0;

async function waitForGeminiSlot() {
  const waitMs = Math.max(0, nextGeminiRequestAt - Date.now());
  if (waitMs) await delay(waitMs);
  nextGeminiRequestAt = Date.now() + minimumRequestIntervalMs;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
