/**
 * Centralna mapa linkowania wewnętrznego (SEO).
 *
 * Cel: każda strona zabiegu ma 3–5 wewnętrznych linków z anchor textem
 * zawierającym słowa kluczowe, strony edukacyjne /dla-pacjenta/* przekazują
 * autorytet do stron /leczenie/*, a wpisy bloga linkują do zabiegu tematycznie.
 *
 * Anchor text (`label`) MUSI zawierać frazę kluczową — nie używamy
 * "kliknij tutaj" / "czytaj więcej".
 */

export interface InternalLink {
  href: string;
  /** Anchor text ze słowem kluczowym */
  label: string;
  /** Krótkie uzasadnienie kontekstowe pod anchorem */
  description: string;
}

export interface InternalLinkGroup {
  /** Nagłówek sekcji na stronie */
  heading: string;
  links: InternalLink[];
}

/* ------------------------------------------------------------------ */
/* Współdzielone definicje docelowych stron zabiegowych                */
/* ------------------------------------------------------------------ */

const T = {
  lhp: {
    href: "/leczenie/lhp",
    label: "hemoroidy — leczenie laserowe (LHP)",
    description: "Laserowa plastyka hemoroidów bez wycinania tkanek, powrót do domu tego samego dnia.",
  },
  filac: {
    href: "/leczenie/filac",
    label: "przetoki odbytu — leczenie laserem FiLaC",
    description: "Zamknięcie kanału przetoki laserem 1470 nm z ochroną zwieraczy.",
  },
  silac: {
    href: "/leczenie/silac",
    label: "torbiel włosowa (pilonidalna) — SiLaC",
    description: "Laserowe zamknięcie zatoki włosowej bez rozległej rany do gojenia.",
  },
  szczelina: {
    href: "/leczenie/szczelina",
    label: "szczelina odbytu — leczenie",
    description: "Ból przy wypróżnianiu i krew na papierze — diagnostyka i leczenie szczeliny.",
  },
  plastyka: {
    href: "/leczenie/plastyka",
    label: "plastyka odbytu bez szwów",
    description: "Korekta fałdów i nadmiaru skóry okolicy odbytu — laserowo, bez szwów.",
  },
  anusitis: {
    href: "/leczenie/anusitis",
    label: "zapalenie odbytu (anusitis) — leczenie",
    description: "Pieczenie i świąd odbytu, które łatwo pomylić z hemoroidami.",
  },
  spazm: {
    href: "/leczenie/spazm-lonowoodbytniczy",
    label: "spazm mięśnia łonowo-odbytniczego",
    description: "Przewlekły ból odbytu z napięcia mięśni dna miednicy.",
  },
  evlt: {
    href: "/leczenie/evlt",
    label: "żylaki nóg — laserowe zamknięcie żyły (EVLT)",
    description: "Endowenozna ablacja laserowa zamiast klasycznego strippingu.",
  },
  skleroterapia: {
    href: "/leczenie/skleroterapia",
    label: "skleroterapia żylaków i naczynek",
    description: "Obliteracja drobnych żylaków i naczyń siatkowatych bez nacięć.",
  },
  mikroflebektomia: {
    href: "/leczenie/mikroflebektomia",
    label: "mikroflebektomia piankowa żylaków",
    description: "Usunięcie widocznych żylaków przez nakłucia o średnicy 1–2 mm.",
  },
  clacs: {
    href: "/leczenie/clacs",
    label: "pajączki naczyniowe — metoda CLaCS",
    description: "Hybryda lasera i skleroterapii o skuteczności 85–95%.",
  },
  fototerapia: {
    href: "/leczenie/fototerapia",
    label: "fototerapia LED (fotobiomodulacja)",
    description: "Przyspieszenie gojenia i zmniejszenie obrzęku po zabiegach.",
  },
  proktologia: {
    href: "/leczenie/proktologia",
    label: "proktologia laserowa — wszystkie zabiegi",
    description: "Pełna lista zabiegów proktologicznych wykonywanych w CML.",
  },
  flebologia: {
    href: "/leczenie/flebologia",
    label: "flebologia — leczenie żylaków i pajączków",
    description: "Pełna lista zabiegów flebologicznych wykonywanych w CML.",
  },
  cennik: {
    href: "/cennik",
    label: "cennik zabiegów proktologicznych i flebologicznych",
    description: "Aktualne ceny konsultacji i zabiegów laserowych.",
  },
} satisfies Record<string, InternalLink>;

/* ------------------------------------------------------------------ */
/* Strony zabiegowe: 3–5 linków „powiązany zabieg → powiązany zabieg"  */
/* ------------------------------------------------------------------ */

const PROCEDURE_HEADING = "Powiązane zabiegi i informacje";
const EDUCATION_HEADING = "Zabiegi powiązane z tym tematem";

export const INTERNAL_LINKS: Record<string, InternalLinkGroup> = {
  /* --- Proktologia --- */
  "/leczenie/lhp": {
    heading: PROCEDURE_HEADING,
    links: [T.szczelina, T.filac, T.plastyka, T.anusitis, T.cennik],
  },
  "/leczenie/filac": {
    heading: PROCEDURE_HEADING,
    links: [T.lhp, T.silac, T.szczelina, T.proktologia],
  },
  "/leczenie/silac": {
    heading: PROCEDURE_HEADING,
    links: [T.filac, T.lhp, T.fototerapia, T.proktologia],
  },
  "/leczenie/szczelina": {
    heading: PROCEDURE_HEADING,
    links: [T.lhp, T.spazm, T.anusitis, T.plastyka],
  },
  "/leczenie/plastyka": {
    heading: PROCEDURE_HEADING,
    links: [T.lhp, T.szczelina, T.anusitis, T.proktologia],
  },
  "/leczenie/anusitis": {
    heading: PROCEDURE_HEADING,
    links: [T.lhp, T.szczelina, T.spazm, T.proktologia],
  },
  "/leczenie/spazm-lonowoodbytniczy": {
    heading: PROCEDURE_HEADING,
    links: [T.szczelina, T.anusitis, T.lhp, T.proktologia],
  },

  /* --- Flebologia --- */
  "/leczenie/evlt": {
    heading: PROCEDURE_HEADING,
    links: [T.mikroflebektomia, T.skleroterapia, T.clacs, T.fototerapia, T.cennik],
  },
  "/leczenie/skleroterapia": {
    heading: PROCEDURE_HEADING,
    links: [T.clacs, T.evlt, T.mikroflebektomia, T.flebologia],
  },
  "/leczenie/mikroflebektomia": {
    heading: PROCEDURE_HEADING,
    links: [T.evlt, T.skleroterapia, T.clacs, T.flebologia],
  },
  "/leczenie/clacs": {
    heading: PROCEDURE_HEADING,
    links: [T.skleroterapia, T.evlt, T.fototerapia, T.flebologia],
  },
  "/leczenie/fototerapia": {
    heading: PROCEDURE_HEADING,
    links: [T.lhp, T.evlt, T.silac, T.flebologia],
  },

  /* --- Strony edukacyjne /dla-pacjenta/* → transfer autorytetu --- */
  "/dla-pacjenta/hemoroidy": {
    heading: EDUCATION_HEADING,
    links: [T.lhp, T.szczelina, T.anusitis, T.proktologia],
  },
  "/dla-pacjenta/hemoroidy-infografika": {
    heading: EDUCATION_HEADING,
    links: [T.lhp, T.plastyka, T.proktologia],
  },
  "/dla-pacjenta/quiz-hemoroidy": {
    heading: EDUCATION_HEADING,
    links: [T.lhp, T.szczelina, T.proktologia],
  },
  "/dla-pacjenta/ebm-hemoroidy": {
    heading: EDUCATION_HEADING,
    links: [T.lhp, T.filac, T.szczelina, T.proktologia],
  },
  "/dla-pacjenta/dziennik-hemoroidy": {
    heading: EDUCATION_HEADING,
    links: [T.lhp, T.anusitis, T.proktologia],
  },
  "/dla-pacjenta/proktolog-faq": {
    heading: EDUCATION_HEADING,
    links: [T.lhp, T.filac, T.szczelina, T.silac, T.proktologia],
  },
  "/dla-pacjenta/faldy-odbytu": {
    heading: EDUCATION_HEADING,
    links: [T.plastyka, T.lhp, T.szczelina],
  },
  "/dla-pacjenta/pajaczki": {
    heading: EDUCATION_HEADING,
    links: [T.clacs, T.skleroterapia, T.evlt, T.flebologia],
  },
  "/dla-pacjenta/ebook-pajaczki": {
    heading: EDUCATION_HEADING,
    links: [T.clacs, T.skleroterapia, T.flebologia],
  },
  "/dla-pacjenta/profilaktyka-zylakow": {
    heading: EDUCATION_HEADING,
    links: [T.evlt, T.skleroterapia, T.clacs, T.mikroflebektomia],
  },
  "/dla-pacjenta/pielegnacja-nog": {
    heading: EDUCATION_HEADING,
    links: [T.evlt, T.clacs, T.fototerapia, T.flebologia],
  },
  "/dla-pacjenta/edukacja": {
    heading: EDUCATION_HEADING,
    links: [T.lhp, T.evlt, T.proktologia, T.flebologia],
  },
};

/** Linki dla wpisów bloga, dobrane po auto-wykrytej kategorii. */
export const BLOG_CATEGORY_LINKS: Record<string, InternalLinkGroup> = {
  proktologia: {
    heading: "Zabiegi powiązane z tym artykułem",
    links: [T.lhp, T.filac, T.szczelina, T.proktologia],
  },
  flebologia: {
    heading: "Zabiegi powiązane z tym artykułem",
    links: [T.evlt, T.clacs, T.skleroterapia, T.flebologia],
  },
  ginekomastia: {
    heading: "Zabiegi powiązane z tym artykułem",
    links: [T.proktologia, T.flebologia, T.cennik],
  },
  inne: {
    heading: "Zabiegi powiązane z tym artykułem",
    links: [T.lhp, T.evlt, T.proktologia, T.flebologia],
  },
};

/** Skrót linków słowa-kluczowe → zabieg, używany na stronie głównej. */
export const HOME_KEYWORD_LINKS: InternalLink[] = [
  T.lhp,
  T.evlt,
  T.filac,
  T.clacs,
  T.silac,
  T.skleroterapia,
];

export const getInternalLinks = (path: string): InternalLinkGroup | undefined =>
  INTERNAL_LINKS[path];
