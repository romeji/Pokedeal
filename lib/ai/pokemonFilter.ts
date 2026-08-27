/**
 * Filtre texte bon marché — section 9 : "Nouvelle annonce → analyse
 * titre/description → Pokémon probable ? → NON: ignorer / OUI: Gemini
 * Vision". Volontairement simple (pas d'IA ici) pour ne pas gaspiller le
 * quota Gemini free tier sur des annonces évidemment hors-sujet.
 *
 * C'est un filtre de PREMIÈRE PASSE, pas une identification — il laisse
 * volontairement passer des faux positifs plutôt que de risquer de rejeter
 * une vraie annonce Pokémon mal titrée.
 */
const POKEMON_KEYWORDS = [
  "pokemon",
  "pokémon",
  "pokeball",
  "poké",
  "carte pokemon",
  "etb",
  "elite trainer",
  "display",
  "booster",
  "tcg",
  "ptcg",
  "151",
  "ex full art",
  "vmax",
  "vstar",
  "gx",
  "charizard",
  "dracaufeu",
  "pikachu",
  "scellé",
  "scellee",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // enlève les accents pour un match plus robuste
}

export function looksLikePokemon(title: string, description?: string | null): boolean {
  const haystack = normalize(`${title} ${description ?? ""}`);
  return POKEMON_KEYWORDS.some((kw) => haystack.includes(normalize(kw)));
}
