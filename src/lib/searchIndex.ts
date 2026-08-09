// Statyczny indeks tematów dla wyszukiwarki na stronie głównej.
// Obejmuje strony zabiegów oraz materiały edukacyjne.

export type SearchCategory =
  | "Proktologia"
  | "Flebologia"
  | "Edukacja"
  | "Przygotowanie"
  | "Po zabiegu";

export interface SearchEntry {
  title: string;
  path: string;
  category: SearchCategory;
  excerpt: string;
  keywords: string[];
}

export const SEARCH_INDEX: SearchEntry[] = [
  // ===== PROKTOLOGIA =====
  {
    title: "LHP – laserowe leczenie hemoroidów",
    path: "/leczenie/lhp",
    category: "Proktologia",
    excerpt: "Bezbolesna laseroplastyka hemoroidów bez wycinania tkanek.",
    keywords: ["lhp", "hemoroidy", "laser", "guzki krwawnicze", "krwawienie"],
  },
  {
    title: "FiLaC – laserowe zamknięcie przetoki",
    path: "/leczenie/filac",
    category: "Proktologia",
    excerpt: "Laser 1470 nm zamykający kanał przetoki okołoodbytniczej.",
    keywords: ["filac", "przetoka", "fistula", "ropień", "laser 1470"],
  },
  {
    title: "SiLaC – torbiel pilonidalna laserowo",
    path: "/leczenie/silac",
    category: "Proktologia",
    excerpt: "30-minutowy laserowy zabieg torbieli włosowej zatoki krzyżowej.",
    keywords: ["silac", "torbiel pilonidalna", "zatoka włosowa", "kość ogonowa"],
  },
  {
    title: "Szczelina odbytu",
    path: "/leczenie/szczelina",
    category: "Proktologia",
    excerpt: "Laserowe i farmakologiczne leczenie szczeliny odbytu.",
    keywords: ["szczelina", "ból", "skurcz zwieracza"],
  },
  {
    title: "Plastyka okolicy odbytu",
    path: "/leczenie/plastyka",
    category: "Proktologia",
    excerpt: "Laserowa plastyka bez szwów, bez blizn.",
    keywords: ["plastyka", "fałdy", "estetyka odbytu"],
  },
  {
    title: "Anusitis – zapalenie odbytu",
    path: "/leczenie/anusitis",
    category: "Proktologia",
    excerpt: "Diagnostyka i leczenie przewlekłego stanu zapalnego.",
    keywords: ["anusitis", "świąd", "pieczenie"],
  },
  {
    title: "Spazm mięśnia łonowo-odbytniczego",
    path: "/leczenie/spazm-lonowoodbytniczy",
    category: "Proktologia",
    excerpt: "Leczenie zespołu bólowego dna miednicy.",
    keywords: ["spazm", "dno miednicy", "ból"],
  },
  {
    title: "Proktologia – przegląd",
    path: "/leczenie/proktologia",
    category: "Proktologia",
    excerpt: "Wszystkie zabiegi proktologiczne w jednym miejscu.",
    keywords: ["proktologia", "proktolog"],
  },

  // ===== FLEBOLOGIA =====
  {
    title: "EVLT – laserowe zamknięcie żył",
    path: "/leczenie/evlt",
    category: "Flebologia",
    excerpt: "Endovenous Laser Treatment dla żylaków kończyn dolnych.",
    keywords: ["evlt", "żylaki", "laser endowaskularny", "ceap"],
  },
  {
    title: "CLaCS – pajączki naczyniowe",
    path: "/leczenie/clacs",
    category: "Flebologia",
    excerpt: "Krio + laser + skleroterapia – metoda hybrydowa 85–95%.",
    keywords: ["clacs", "pajączki", "telangiektazje", "krio"],
  },
  {
    title: "Skleroterapia",
    path: "/leczenie/skleroterapia",
    category: "Flebologia",
    excerpt: "Klasyczne i piankowe leczenie żylaków siateczkowatych.",
    keywords: ["skleroterapia", "pianka", "polidokanol"],
  },
  {
    title: "Mikroflebektomia piankowa",
    path: "/leczenie/mikroflebektomia",
    category: "Flebologia",
    excerpt: "Mechaniczne usunięcie żylaków z minimalnymi nacięciami.",
    keywords: ["mikroflebektomia", "muller", "żylaki"],
  },
  {
    title: "Fototerapia LED (PBM)",
    path: "/leczenie/fototerapia",
    category: "Flebologia",
    excerpt: "Fotobiomodulacja przyspieszająca gojenie po zabiegach.",
    keywords: ["fototerapia", "led", "pbm", "regeneracja"],
  },
  {
    title: "Flebologia – przegląd",
    path: "/leczenie/flebologia",
    category: "Flebologia",
    excerpt: "Wszystkie zabiegi naczyniowe w jednym miejscu.",
    keywords: ["flebologia", "flebolog", "żyły"],
  },

  // ===== EDUKACJA =====
  {
    title: "Hemoroidy – kompendium A do Z",
    path: "/dla-pacjenta/hemoroidy",
    category: "Edukacja",
    excerpt: "Wszystko o hemoroidach: stopnie, objawy, leczenie.",
    keywords: ["hemoroidy", "guzki", "krwawienie", "stopnie"],
  },
  {
    title: "Hemoroidy – infografika",
    path: "/dla-pacjenta/hemoroidy-infografika",
    category: "Edukacja",
    excerpt: "Statystyki LHP vs klasyczna chirurgia.",
    keywords: ["hemoroidy", "infografika", "porównanie"],
  },
  {
    title: "Pajączki naczyniowe",
    path: "/dla-pacjenta/pajaczki",
    category: "Edukacja",
    excerpt: "Anatomia, przyczyny i metody leczenia pajączków.",
    keywords: ["pajączki", "telangiektazje", "venulectazja"],
  },
  {
    title: "E-book: Pajączki",
    path: "/dla-pacjenta/ebook-pajaczki",
    category: "Edukacja",
    excerpt: "Interaktywny przewodnik online o pajączkach i PNŻ.",
    keywords: ["ebook", "pajączki", "pnż"],
  },
  {
    title: "Fałdy okolicy odbytu",
    path: "/dla-pacjenta/faldy-odbytu",
    category: "Edukacja",
    excerpt: "Wariant anatomiczny czy realny problem estetyczny?",
    keywords: ["fałdy", "marisca", "estetyka"],
  },
  {
    title: "FAQ proktologiczne",
    path: "/dla-pacjenta/proktolog-faq",
    category: "Edukacja",
    excerpt: "Najczęstsze pytania pacjentów do proktologa.",
    keywords: ["faq", "pytania", "proktolog"],
  },
  {
    title: "Pielęgnacja nóg",
    path: "/dla-pacjenta/pielegnacja-nog",
    category: "Edukacja",
    excerpt: "3-fazowy program pielęgnacji po zabiegach naczyniowych.",
    keywords: ["pielęgnacja", "nogi", "krem"],
  },
  {
    title: "Profilaktyka żylaków",
    path: "/dla-pacjenta/profilaktyka-zylakow",
    category: "Edukacja",
    excerpt: "6 filarów profilaktyki + ćwiczenia + quiz ryzyka.",
    keywords: ["profilaktyka", "żylaki", "zapobieganie", "quiz"],
  },
  {
    title: "Świadomy pacjent w gabinecie",
    path: "/dla-pacjenta/edukacja",
    category: "Edukacja",
    excerpt: "Co warto wiedzieć przed wizytą u specjalisty.",
    keywords: ["edukacja", "wizyta", "konsultacja"],
  },

  // ===== PRZYGOTOWANIE =====
  {
    title: "Przygotowanie do EVLT",
    path: "/dla-pacjenta/przygotowanie-evlt",
    category: "Przygotowanie",
    excerpt: "Checklist przed zabiegiem laserowego zamknięcia żył.",
    keywords: ["przygotowanie", "evlt", "przed zabiegiem"],
  },
  {
    title: "Przygotowanie do LHP",
    path: "/dla-pacjenta/przygotowanie-lhp",
    category: "Przygotowanie",
    excerpt: "Survival kit i checklist przed laseroplastyką hemoroidów.",
    keywords: ["przygotowanie", "lhp", "checklist"],
  },

  // ===== PO ZABIEGU =====
  { title: "Zalecenia po EVLT", path: "/dla-pacjenta/zalecenia-po-evlt", category: "Po zabiegu", excerpt: "Powrót do aktywności po laserowym zamknięciu żył.", keywords: ["zalecenia", "evlt", "rekonwalescencja"] },
  { title: "Zalecenia po LHP", path: "/dla-pacjenta/zalecenia-po-lhp", category: "Po zabiegu", excerpt: "Powrót do komfortu po laseroplastyce hemoroidów.", keywords: ["zalecenia", "lhp"] },
  { title: "Zalecenia po CLaCS", path: "/dla-pacjenta/zalecenia-po-clacs", category: "Po zabiegu", excerpt: "Pielęgnacja po zabiegu na pajączki.", keywords: ["zalecenia", "clacs"] },
  { title: "Zalecenia po FiLaC", path: "/dla-pacjenta/zalecenia-po-filac", category: "Po zabiegu", excerpt: "Pielęgnacja po laserowym zamknięciu przetoki.", keywords: ["zalecenia", "filac"] },
  { title: "Zalecenia po SiLaC", path: "/dla-pacjenta/zalecenia-po-silac", category: "Po zabiegu", excerpt: "Powrót do aktywności po torbieli pilonidalnej.", keywords: ["zalecenia", "silac"] },
  { title: "Zalecenia po skleroterapii", path: "/dla-pacjenta/zalecenia-po-skleroterapii", category: "Po zabiegu", excerpt: "Pielęgnacja kończyn po skleroterapii.", keywords: ["zalecenia", "skleroterapia"] },
  { title: "Zalecenia po plastyce", path: "/dla-pacjenta/zalecenia-po-plastyce", category: "Po zabiegu", excerpt: "Pielęgnacja po plastyce okolicy odbytu.", keywords: ["zalecenia", "plastyka"] },
  { title: "Zalecenia po mikroflebektomii", path: "/dla-pacjenta/zalecenia-po-mikroflebektomii", category: "Po zabiegu", excerpt: "Powrót do formy po mikroflebektomii.", keywords: ["zalecenia", "mikroflebektomia"] },
];

/** Normalizacja PL: usuwa diakrytyki i lower-case dla tolerancyjnego matchowania. */
const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l");

export interface ScoredEntry extends SearchEntry {
  score: number;
}

/** Wyszukiwanie tolerancyjne (substring match w title, keywords, excerpt). */
export const searchTopics = (query: string, limit = 8): ScoredEntry[] => {
  const q = normalize(query.trim());
  if (q.length < 2) return [];

  const results: ScoredEntry[] = [];
  for (const entry of SEARCH_INDEX) {
    const title = normalize(entry.title);
    const keywords = entry.keywords.map(normalize);
    const excerpt = normalize(entry.excerpt);
    const category = normalize(entry.category);

    let score = 0;
    if (title.startsWith(q)) score += 100;
    else if (title.includes(q)) score += 60;
    if (keywords.some((k) => k === q)) score += 50;
    else if (keywords.some((k) => k.includes(q))) score += 30;
    if (category.includes(q)) score += 20;
    if (excerpt.includes(q)) score += 10;

    if (score > 0) results.push({ ...entry, score });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
};
