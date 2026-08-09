/**
 * Kompresja/dekompresja zaznaczeń checklisty czynników ryzyka do URL-friendly stringa.
 *
 * Strategia: każdy id w `RISK_FACTOR_IDS` ma stabilny indeks (0..N-1).
 * Zaznaczenia kodujemy jako lista indeksów oddzielonych przecinkami,
 * potem base64url. Daje ~20-30 znaków przy 8 zaznaczonych vs ~120 dla pełnych id.
 *
 * UWAGA: kolejność `RISK_FACTOR_IDS` musi być stabilna — dopisuj nowe id na końcu,
 * nigdy nie zmieniaj kolejności istniejących.
 */

/** Stabilna kolejność id — kopia z RiskFactorsAccordion.RISK_FACTORS, NIE zmieniaj kolejności. */
export const RISK_FACTOR_IDS = [
  "constipation",
  "fiber",
  "hydration",
  "toilet",
  "sedentary",
  "pregnancy",
  "obesity",
  "genetics",
  "heavy-lifting",
  "anal-sex",
  "movement",
  "spicy-alcohol",
] as const;

const toBase64Url = (input: string): string => {
  if (typeof window === "undefined") return "";
  const b64 = window.btoa(unescape(encodeURIComponent(input)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (input: string): string => {
  if (typeof window === "undefined") return "";
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "===".slice((b64.length + 3) % 4);
  try {
    return decodeURIComponent(escape(window.atob(padded)));
  } catch {
    return "";
  }
};

/** Zwraca payload (np. "MCwxLDIsMw") albo "" jeśli pusty. */
export const encodeChecklist = (selectedIds: string[]): string => {
  const indices = selectedIds
    .map((id) => RISK_FACTOR_IDS.indexOf(id as (typeof RISK_FACTOR_IDS)[number]))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  if (indices.length === 0) return "";
  return toBase64Url(indices.join(","));
};

/** Odczytuje payload → tablica id. Niepoprawne / spoza zakresu są pomijane. */
export const decodeChecklist = (payload: string): string[] => {
  if (!payload) return [];
  const raw = fromBase64Url(payload);
  if (!raw || !/^[\d,]+$/.test(raw)) return [];
  const seen = new Set<string>();
  raw.split(",").forEach((part) => {
    const idx = Number.parseInt(part, 10);
    if (Number.isInteger(idx) && idx >= 0 && idx < RISK_FACTOR_IDS.length) {
      seen.add(RISK_FACTOR_IDS[idx]);
    }
  });
  return Array.from(seen);
};

/** Buduje pełny URL z zakodowaną checklistą i hashem do sekcji. */
export const buildChecklistShareUrl = (selectedIds: string[]): string => {
  const payload = encodeChecklist(selectedIds);
  const base =
    typeof window !== "undefined"
      ? `${window.location.origin}/dla-pacjenta/hemoroidy`
      : "https://mcml.pro/dla-pacjenta/hemoroidy";
  if (!payload) return `${base}#moja-checklista-ryzyka`;
  return `${base}?c=${payload}#moja-checklista-ryzyka`;
};

/** Krótki kod do podyktowania ustnie / wpisania ręcznie (sam payload bez URL). */
export const buildChecklistShortCode = (selectedIds: string[]): string =>
  encodeChecklist(selectedIds);
