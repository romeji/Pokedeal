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
  if (POKEMON_KEYWORDS.some((kw) => haystack.includes(normalize(kw)))) return true;

  // Beaucoup d'annonces ne contiennent que le nom de la carte :
  // "Aquali-V 074/069" ou "Mienshao PAR 200 IR Full Art". Ces motifs TCG
  // sont assez spécifiques pour ne pas bloquer ces vraies cartes avant Gemini.
  const cardNumber = /\b\d{1,3}\s*\/\s*\d{1,3}\b/;
  const tcgVocabulary = /\b(full art|alt art|illustration rare|special illustration|holo|reverse|vmax|vstar|par|sir|tg|ex|gx)\b/;
  return cardNumber.test(haystack) || tcgVocabulary.test(haystack);
}
