/**
 * Kategoryzacja wpisów bloga na podstawie słów kluczowych w tytule i excerpcie.
 * Auto-detekcja — bez kolumny w bazie. Dopasowanie do pierwszej kategorii w kolejności
 * `CATEGORY_ORDER`, jeśli żadna nie pasuje → "inne".
 */

export type BlogCategory = "flebologia" | "proktologia" | "ginekomastia" | "inne";

export const CATEGORY_LABELS: Record<BlogCategory, string> = {
  flebologia: "Flebologia",
  proktologia: "Proktologia",
  ginekomastia: "Ginekomastia",
  inne: "Inne",
};

/** Kolejność dopasowania — pierwsza pasująca wygrywa. */
export const CATEGORY_ORDER: BlogCategory[] = [
  "ginekomastia",
  "proktologia",
  "flebologia",
  "inne",
];

/** Słowa kluczowe (lowercase, bez polskich znaków też wpisane wariantywnie). */
const KEYWORDS: Record<Exclude<BlogCategory, "inne">, string[]> = {
  flebologia: [
    "flebolog",
    "żył",
    "zył",
    "żyl",
    "zyl",
    "pajączk",
    "pajaczk",
    "evlt",
    "clacs",
    "skleroterap",
    "mikroflebektom",
    "venul",
    "venous",
    "varicose",
    "owrzodzeni",
    "ceap",
  ],
  proktologia: [
    "proktolog",
    "hemoroid",
    "szczelin",
    "odbyt",
    "odbytnic",
    "fistul",
    "przetok",
    "filac",
    "silac",
    "lhp",
    "fald",
    "spazm",
    "anus",
    "anal",
    "pilonidal",
    "torbiel włosow",
    "torbiel wlosow",
  ],
  ginekomastia: ["ginekomast", "gynecomast", "gruczoł piersiow", "gruczol piersiow"],
};

const stripDiacritics = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export const detectCategory = (post: {
  title?: string | null;
  excerpt?: string | null;
}): BlogCategory => {
  const haystack = stripDiacritics(`${post.title ?? ""} ${post.excerpt ?? ""}`);
  for (const cat of CATEGORY_ORDER) {
    if (cat === "inne") continue;
    const kws = KEYWORDS[cat];
    if (kws.some((k) => haystack.includes(stripDiacritics(k)))) return cat;
  }
  return "inne";
};
