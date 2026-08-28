const BASE_URL = "https://api.tcgdex.net/v2";

export type TcgdexSetBrief = {
  id: string;
  name: string;
  logo?: string;
  symbol?: string;
  releaseDate?: string;
  cardCount: { total: number; official: number };
};

export type TcgdexSeriesBrief = { id: string; name: string; logo?: string };
export type TcgdexSeries = TcgdexSeriesBrief & { releaseDate?: string; sets: TcgdexSetBrief[] };

export type TcgdexCardBrief = {
  id: string;
  localId: string;
  name: string;
  image?: string;
};

export type TcgdexSet = TcgdexSetBrief & { cards: TcgdexCardBrief[] };

export type TcgdexCard = TcgdexCardBrief & {
  rarity?: string;
  category?: string;
  set: { id: string; name: string; logo?: string; cardCount: { total: number; official: number } };
  variants?: Record<string, boolean>;
  pricing?: {
    cardmarket?: {
      idProduct?: number;
      trend?: number | null;
      avg?: number | null;
      low?: number | null;
      updated?: string;
      unit?: string;
    };
  };
};

async function tcgdexFetch<T>(path: string, revalidate = 3600): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    signal: AbortSignal.timeout(15_000),
    next: { revalidate },
  });
  if (!response.ok) throw new Error(`TCGdex indisponible (${response.status})`);
  return response.json() as Promise<T>;
}

export function assetImage(base?: string, quality: "low" | "high" = "high") {
  return base ? `${base}/${quality}.webp` : null;
}

export function assetLogo(base?: string) {
  return base ? `${base}.webp` : null;
}

export function listSets(language = "fr") {
  return tcgdexFetch<TcgdexSetBrief[]>(`/${language}/sets`, 6 * 3600);
}

export function listSeries(language = "fr") {
  return tcgdexFetch<TcgdexSeriesBrief[]>(`/${language}/series`, 6 * 3600);
}

export function getSeries(id: string, language = "fr") {
  return tcgdexFetch<TcgdexSeries>(`/${language}/series/${encodeURIComponent(id)}`, 6 * 3600);
}

export function getSet(id: string, language = "fr") {
  return tcgdexFetch<TcgdexSet>(`/${language}/sets/${encodeURIComponent(id)}`, 6 * 3600);
}

export function getCard(id: string, language = "fr") {
  return tcgdexFetch<TcgdexCard>(`/${language}/cards/${encodeURIComponent(id)}`, 3600);
}

export function searchCards(query: string, language = "fr") {
  const params = new URLSearchParams({ name: query });
  return tcgdexFetch<TcgdexCardBrief[]>(`/${language}/cards?${params}`, 3600);
}

const SEARCH_NOISE = new Set(["pokemon", "pokémon", "tcg", "carte", "cartes", "card", "cards", "set", "bloc", "block", "serie", "série", "fr", "francais", "francaise", "francaises", "anglais", "english", "en", "japonais", "japonaise", "jp"]);
const normalizeSearch = (value: string) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
const SET_CONTEXT = new Set([...SEARCH_NOISE, "bundle", "booster", "display", "coffret", "box", "etb", "tripack", "blister", "tin", "mini"]);

function normalizeSetId(value: string) {
  if (/^ev\d/i.test(value)) return value.toLowerCase().replace(/^ev(\d)(?!\d)/, "sv0$1").replace(/^ev/, "sv");
  if (/^me\d$/i.test(value)) return value.toLowerCase().replace(/^me/, "me0");
  return value.toLowerCase();
}

export async function resolveSetQuery(query: string) {
  const normalized = normalizeSearch(query);
  const rawTokens = normalized.split(" ").filter(Boolean);
  const wantedId = normalizeSetId(rawTokens.find((token) => /^(?:ev|sv|me)\d+(?:\.\d+)?[a-z]?$/.test(token)) ?? "");
  const setTokens = rawTokens.filter((token) => token.length > 1 && !SET_CONTEXT.has(token));
  const sets = await listSets("fr").catch(() => []);
  const candidates = sets.filter((set) => {
    const name = normalizeSearch(set.name);
    return (wantedId && set.id.toLowerCase() === wantedId) || name === setTokens.join(" ") ||
      (setTokens.length > 0 && setTokens.every((token) => name.includes(token)));
  });
  if (candidates.length !== 1) return null;
  const [fr, en] = await Promise.all([
    getSet(candidates[0]!.id, "fr").catch(() => null),
    getSet(candidates[0]!.id, "en").catch(() => null),
  ]);
  return fr ? { fr, en } : null;
}

/** Recherche tolérante FR : nom de carte, phrase naturelle ou nom de série. */
export async function searchCardsDetailed(query: string, limit = 30): Promise<TcgdexCard[]> {
  const normalized = normalizeSearch(query);
  const meaningful = normalized.split(" ").filter((token) => token.length > 1 && !SEARCH_NOISE.has(token));
  const cardQuery = meaningful.join(" ") || normalized;
  const setMatch = (await resolveSetQuery(query))?.fr;

  let briefs: TcgdexCardBrief[];
  let language = "fr";
  if (setMatch) {
    briefs = setMatch.cards;
  } else {
    briefs = await searchCards(cardQuery, "fr");
    if (!briefs.length) {
      language = "en";
      briefs = await searchCards(cardQuery, "en");
    }
  }

  const selected = briefs.slice(0, Math.max(1, Math.min(limit, 40)));
  return Promise.all(selected.map(async (brief) => {
    try { return await getCard(brief.id, language); }
    catch { return { ...brief, set: { id: "", name: "", cardCount: { total: 0, official: 0 } } }; }
  }));
}
