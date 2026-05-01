/**
 * Sugestie / fuzzy-redirect dla 404.
 *
 * Cel: gdy użytkownik trafi na nieistniejący URL (np. literówka w adresie,
 * stary slug z mailu sprzed lat), wybierz najbliższy wpis z `SEO_REDIRECTS`
 * lub realny route i albo automatycznie przekieruj (wysokie score), albo
 * pokaż grzeczne „Czy chodziło Ci o…?" (średnie score).
 *
 * Algorytm scoringu (kolejność, każdy etap może zwrócić wcześniej):
 *
 *  1. **Normalizacja**: lowercase, NFD + strip diacritics (`żylaki` → `zylaki`),
 *     usunięcie wiodącego `/` i końcowego `/`.
 *  2. **Exact po normalizacji** → score 1.0 (np. `/Żylaki/` → `/zylaki`).
 *  3. **Substring**: kandydat zawiera wejście lub odwrotnie → score 0.85.
 *  4. **Token overlap**: Jaccard po segmentach `/` i `-` (np. `/leczenie/laser-zylakow`
 *     vs `/laser-zylaki` — wspólne tokeny). Score 0..1 z wagą 0.7.
 *  5. **Levenshtein** znormalizowany 1 - dist/maxLen → score 0..1 z wagą 0.6.
 *  6. **Końcowy score** = max z (substring, jaccard*0.9, levenshtein*0.95). Best wins.
 *
 * Progi (skalibrowane na realnych aliasach):
 *  - score ≥ 0.82 → AUTO redirect (wysoka pewność).
 *  - 0.55 ≤ score < 0.82 → SUGGEST (pokaż link, nie redirectuj).
 *  - score < 0.55 → brak sugestii.
 *
 * Helper jest CZYSTY (no React, no DOM). Testowalny w izolacji.
 */
import { SEO_REDIRECTS } from "./redirectsMap";

export interface SuggestionResult {
  /** Najlepszy kandydat (znormalizowana ścieżka z `/` na początku) lub null. */
  to: string | null;
  /** Skąd pochodzi sugestia: alias z mapy lub realny route z App.tsx. */
  source: "redirect-map" | "app-route" | null;
  /** 0..1 — pewność dopasowania. */
  score: number;
  /** Akcja sugerowana komponentowi UI. */
  action: "auto-redirect" | "suggest" | "none";
  /** Pomocniczo: kandydat aliasu (`from`) który zmatchował, jeśli z mapy. */
  matchedFrom: string | null;
}

const AUTO_THRESHOLD = 0.82;
const SUGGEST_THRESHOLD = 0.55;

// ── Kandydaci „realne route'y" — minimum, żeby trafić w typowe pomyłki ──────
// Trzymamy hardcoded, bo to czysty helper bez parsowania App.tsx (parser jest
// w testach). Lista pokrywa najpopularniejsze cele i wszystkie huby.
const APP_ROUTE_CANDIDATES: readonly string[] = [
  "/",
  "/o-nas",
  "/wspolpraca",
  "/kontakt",
  "/cennik",
  "/blog",
  "/dla-pacjenta",
  "/dla-pacjenta/hemoroidy",
  "/dla-pacjenta/pajaczki",
  "/dla-pacjenta/edukacja",
  "/dla-pacjenta/profilaktyka-zylakow",
  "/dla-pacjenta/pielegnacja-nog",
  "/dla-pacjenta/proktolog-faq",
  "/leczenie/proktologia",
  "/leczenie/flebologia",
  "/leczenie/lhp",
  "/leczenie/evlt",
  "/leczenie/filac",
  "/leczenie/silac",
  "/leczenie/clacs",
  "/leczenie/skleroterapia",
  "/leczenie/mikroflebektomia",
  "/leczenie/szczelina",
  "/leczenie/plastyka",
  "/leczenie/anusitis",
  "/leczenie/fototerapia",
  "/leczenie/ginekomastia",
  "/leczenie/spazm-lonowoodbytniczy",
];

// ── Normalizacja ────────────────────────────────────────────────────────────
export function normalizePath(p: string): string {
  if (!p) return "";
  return p
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^\w\-/]/g, "") // strip emoji/specials, zachowaj /-
    .replace(/\/+/g, "/")
    .replace(/^\/?/, "/")
    .replace(/\/$/, "")
    .trim();
}

function tokenize(p: string): string[] {
  return normalizePath(p)
    .split(/[/-]/)
    .filter(Boolean);
}

// ── Levenshtein (iteracyjny, O(m*n) ale stringi krótkie) ────────────────────
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function levenshteinScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function jaccard(aTokens: string[], bTokens: string[]): number {
  if (aTokens.length === 0 && bTokens.length === 0) return 1;
  const A = new Set(aTokens);
  const B = new Set(bTokens);
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : inter / union;
}

// ── Public API ──────────────────────────────────────────────────────────────

interface CandidateScore {
  to: string;
  source: "redirect-map" | "app-route";
  matchedFrom: string | null;
  score: number;
}

/**
 * Wylicz najlepszą sugestię dla danej ścieżki 404.
 *
 * Możesz nadpisać listę kandydatów w testach (drugi argument).
 */
export function suggestRedirect(
  pathname: string,
  options?: { extraRoutes?: readonly string[] },
): SuggestionResult {
  const inputNorm = normalizePath(pathname);
  if (!inputNorm || inputNorm === "/") {
    return { to: null, source: null, score: 0, action: "none", matchedFrom: null };
  }
  const inputTokens = tokenize(inputNorm);

  const candidates: CandidateScore[] = [];

  // Wpisy z mapy SEO_REDIRECTS — kluczem porównania jest `from`, celem `to`.
  for (const entry of SEO_REDIRECTS) {
    const fromNorm = normalizePath(entry.from);
    const score = scorePair(inputNorm, inputTokens, fromNorm);
    candidates.push({
      to: entry.to,
      source: "redirect-map",
      matchedFrom: entry.from,
      score,
    });
  }

  // Realne route'y — kluczem i celem jest sama ścieżka.
  const routes = options?.extraRoutes ?? APP_ROUTE_CANDIDATES;
  for (const route of routes) {
    const routeNorm = normalizePath(route);
    const score = scorePair(inputNorm, inputTokens, routeNorm);
    candidates.push({
      to: route,
      source: "app-route",
      matchedFrom: null,
      score,
    });
  }

  // Posortuj malejąco po score; w razie remisu preferuj redirect-map (intencja autora).
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.source === "redirect-map" && b.source !== "redirect-map") return -1;
    if (b.source === "redirect-map" && a.source !== "redirect-map") return 1;
    return 0;
  });

  const best = candidates[0];
  if (!best || best.score < SUGGEST_THRESHOLD) {
    return { to: null, source: null, score: best?.score ?? 0, action: "none", matchedFrom: null };
  }

  const action: SuggestionResult["action"] =
    best.score >= AUTO_THRESHOLD ? "auto-redirect" : "suggest";

  return {
    to: best.to,
    source: best.source,
    score: Number(best.score.toFixed(3)),
    action,
    matchedFrom: best.matchedFrom,
  };
}

function scorePair(inputNorm: string, inputTokens: string[], candidateNorm: string): number {
  if (inputNorm === candidateNorm) return 1;

  // Substring obu kierunków — silny sygnał (np. /pajaczki w /pajaczki-leczenie).
  // WAŻNE: wymaga obu stron niepustych i minimum 3 znaków po stronie krótszej,
  // inaczej każdy input zawierałby pusty `""` lub `/` z kandydata i score=0.85
  // dla totalnie obcych ścieżek.
  const minLen = Math.min(inputNorm.length, candidateNorm.length);
  const isSubstring =
    minLen >= 3 &&
    (candidateNorm.includes(inputNorm) || inputNorm.includes(candidateNorm));
  const substringScore = isSubstring ? 0.85 : 0;

  const candTokens = candidateNorm.split(/[/-]/).filter(Boolean);
  const jaccardScore = jaccard(inputTokens, candTokens) * 0.9;

  const levScore = levenshteinScore(inputNorm, candidateNorm) * 0.95;

  return Math.max(substringScore, jaccardScore, levScore);
}

/** Test-only re-export progów (do walidacji w testach). */
export const __thresholds = { AUTO: AUTO_THRESHOLD, SUGGEST: SUGGEST_THRESHOLD };

