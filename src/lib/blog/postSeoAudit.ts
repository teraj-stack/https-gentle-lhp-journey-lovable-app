/**
 * Walidacja redakcyjna wpisu bloga pod SEO.
 *
 * Reguły wynikają ze strategii bloga jako lejka:
 *  - long-form (min. 1500 słów) = lepszy sygnał tematyczny dla Google,
 *  - 3–5 linków do stron /leczenie/* = transfer autorytetu na strony konwertujące,
 *  - jedna fraza long-tail obecna w tytule, slugu, leadzie i nagłówku H2/H3.
 */

export const MIN_WORDS = 1500;
export const MIN_TREATMENT_LINKS = 3;
export const MAX_TREATMENT_LINKS = 5;

export type AuditStatus = "ok" | "warn" | "fail";

export interface AuditCheck {
  id: string;
  label: string;
  status: AuditStatus;
  detail: string;
}

export interface PostAuditInput {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  focusKeyword: string;
}

export interface PostAudit {
  words: number;
  treatmentLinks: string[];
  checks: AuditCheck[];
  score: number;
}

/** Usuwa polskie znaki diakrytyczne i normalizuje do porównań */
export const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Liczba słów w treści markdown (bez znaczników i bloków kodu) */
export const countWords = (markdown: string) => {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_~|-]+/g, " ");
  return plain.split(/\s+/).filter(Boolean).length;
};

/** Wszystkie linki do stron zabiegowych /leczenie/... użyte w treści */
export const extractTreatmentLinks = (markdown: string) => {
  const found = new Set<string>();
  const patterns = [
    /\]\((\/leczenie\/[^)\s#]*)/g,
    /href="(\/leczenie\/[^"\s#]*)/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(markdown)) !== null) {
      found.add(match[1].replace(/\/$/, ""));
    }
  }
  return Array.from(found);
};

const statusOf = (ok: boolean, warn = false): AuditStatus =>
  ok ? "ok" : warn ? "warn" : "fail";

export const auditPost = ({
  title,
  slug,
  excerpt,
  content,
  focusKeyword,
}: PostAuditInput): PostAudit => {
  const words = countWords(content);
  const treatmentLinks = extractTreatmentLinks(content);
  const keyword = focusKeyword.trim();
  const nKeyword = normalize(keyword);
  const hasKeyword = (haystack: string) =>
    nKeyword.length > 0 && normalize(haystack).includes(nKeyword);

  const headings = content
    .split("\n")
    .filter((line) => /^#{2,3}\s/.test(line.trim()));

  const lead = content.split(/\n\s*\n/).find((p) => !p.trim().startsWith("#")) ?? "";

  const checks: AuditCheck[] = [
    {
      id: "keyword",
      label: "Fraza kluczowa long-tail",
      status: statusOf(nKeyword.split(" ").length >= 3, nKeyword.length > 0),
      detail: keyword
        ? `„${keyword}" — ${nKeyword.split(" ").length} słowa/słów (long-tail = min. 3)`
        : "Nie ustawiono frazy kluczowej",
    },
    {
      id: "words",
      label: `Długość treści (min. ${MIN_WORDS} słów)`,
      status: statusOf(words >= MIN_WORDS, words >= MIN_WORDS * 0.8),
      detail: `${words} słów`,
    },
    {
      id: "links",
      label: `Linki do /leczenie/* (${MIN_TREATMENT_LINKS}–${MAX_TREATMENT_LINKS})`,
      status: statusOf(
        treatmentLinks.length >= MIN_TREATMENT_LINKS &&
          treatmentLinks.length <= MAX_TREATMENT_LINKS,
        treatmentLinks.length > 0,
      ),
      detail: treatmentLinks.length
        ? treatmentLinks.join(", ")
        : "Brak linków do stron zabiegowych",
    },
    {
      id: "keyword-title",
      label: "Fraza w tytule",
      status: statusOf(hasKeyword(title)),
      detail: hasKeyword(title) ? "Obecna" : "Dodaj frazę do tytułu (najlepiej na początku)",
    },
    {
      id: "keyword-slug",
      label: "Fraza w adresie URL",
      status: statusOf(hasKeyword(slug), true),
      detail: hasKeyword(slug) ? "Obecna" : "Slug nie zawiera frazy kluczowej",
    },
    {
      id: "keyword-lead",
      label: "Fraza w pierwszym akapicie",
      status: statusOf(hasKeyword(lead)),
      detail: hasKeyword(lead)
        ? "Obecna"
        : "Umieść frazę w pierwszych 100 słowach tekstu",
    },
    {
      id: "keyword-heading",
      label: "Fraza w nagłówku H2/H3",
      status: statusOf(headings.some((h) => hasKeyword(h))),
      detail: headings.length
        ? `${headings.length} nagłówków, fraza ${headings.some((h) => hasKeyword(h)) ? "obecna" : "nieobecna"}`
        : "Brak nagłówków H2/H3 — podziel tekst na sekcje",
    },
    {
      id: "excerpt",
      label: "Streszczenie (120–160 znaków)",
      status: statusOf(
        excerpt.length >= 120 && excerpt.length <= 160,
        excerpt.length > 0,
      ),
      detail: `${excerpt.length} znaków`,
    },
  ];

  const score = Math.round(
    (checks.reduce((sum, c) => sum + (c.status === "ok" ? 1 : c.status === "warn" ? 0.5 : 0), 0) /
      checks.length) *
      100,
  );

  return { words, treatmentLinks, checks, score };
};

/** Czy wpis jest gotowy do publikacji (twarde wymagania) */
export const isPublishReady = (audit: PostAudit) =>
  audit.checks.filter((c) => c.status === "fail").length === 0;
