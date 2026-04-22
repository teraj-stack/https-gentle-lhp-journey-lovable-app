/**
 * Serializacja preferencji stylu focusu (afterglow / ring / glow) do dwóch formatów
 * przenośnych między urządzeniami:
 *
 *  1) **JSON file** — pełny obiekt z `version` + `exportedAt`, idealny do backupu
 *     albo wysłania kolegom mailem. Plik `.json` pobierany przez Blob/URL w UI.
 *  2) **URL fragment** — kompaktowy base64url (bez `=`/`+`/`/`) doklejany do hasha
 *     `#focus-prefs=...`. Krótszy → lepszy do skopiowania w komunikatorze.
 *     Hash, NIE query, bo: (a) nie trafia do logów serwera, (b) nie zaśmieca
 *     analytics, (c) `useScrollToHash` w Layout nie reaguje na klucz `focus-prefs=`
 *     (regex wymaga sekcji `#section-id`, nie `#key=value`).
 *
 * **Per-variant preferences (v2):** Od version=2 schema trzyma 3 osobne sety prefs
 * dla 3 wariantów motywu — `light` / `dark` / `hc` (high-contrast). Powód: ring
 * 2px na ciemnym tle wygląda inaczej niż na jasnym (mniej kontrastu z primary),
 * a HC potrzebuje ZNACZĄCO grubszego ringa i mocniejszego halo. Zamiast dopasowywać
 * ręcznie przy każdej zmianie motywu — admin ustawia raz, system przełącza automatycznie.
 *
 * Wszystkie wartości są clampowane do tych samych zakresów co w UI sliderów —
 * gdy ktoś podrzuci URL z `afterglowMs=99999`, dostanie max=6000 zamiast crashu.
 *
 * Wyciągnięte z `AdminSystemHealth.tsx` jako pure-helper żeby pokryć testem
 * jednostkowym (round-trip, walidacja, wersjonowanie, migracja v1→v2).
 */

export interface FocusPrefs {
  /** 800–6000 ms */
  afterglowMs: number;
  /** 1–6 px (HC dodaje +2 wewnątrz `applyPulseSequence`, ale tu już użytkownik
   * ustawia bazową grubość per-variant — variant `hc` startuje z większą wartością). */
  ringWidthPx: number;
  /** 0–100 (% intensywności halo) */
  glowIntensity: number;
}

/** Trzy warianty motywu, dla których trzymamy osobne prefs. */
export type ThemeVariant = "light" | "dark" | "hc";

export const THEME_VARIANTS: readonly ThemeVariant[] = ["light", "dark", "hc"] as const;

/** Mapa variant → prefs. */
export type FocusPrefsByVariant = Record<ThemeVariant, FocusPrefs>;

/** Schemat eksportu — wersjonujemy żeby móc bez konfliktu zmienić strukturę.
 *  v1 = pojedynczy `prefs` (legacy, accepted on import).
 *  v2 = `variants: { light, dark, hc }` (current).
 */
export interface FocusPrefsExportV1 {
  version: 1;
  exportedAt: string;
  prefs: FocusPrefs;
}
export interface FocusPrefsExportV2 {
  version: 2;
  exportedAt: string;
  variants: FocusPrefsByVariant;
}
export type FocusPrefsExport = FocusPrefsExportV1 | FocusPrefsExportV2;

/** Wartości domyślne per variant — dobrane „rozsądnie" pod każdy motyw.
 *  - `light`: cienki ring (kontrast wysoki na jasnym tle), umiarkowany glow.
 *  - `dark`: identyczne jak light; admin może podkręcić glow gdy ciemny motyw
 *    wymaga mocniejszego sygnału (subiektywne).
 *  - `hc`: grubszy ring + dłuższy afterglow + mocniejszy glow (low-vision a11y).
 */
const DEFAULTS_PER_VARIANT: FocusPrefsByVariant = {
  light: { afterglowMs: 2400, ringWidthPx: 2, glowIntensity: 55 },
  dark: { afterglowMs: 2400, ringWidthPx: 2, glowIntensity: 55 },
  hc: { afterglowMs: 3200, ringWidthPx: 4, glowIntensity: 80 },
};

/** Default „na jeden zestaw" — back-compat dla legacy importu/legacy URL fragmentu
 *  oraz dla konsumentów którzy chcą jednego dolnego defaulta. */
const DEFAULTS: FocusPrefs = DEFAULTS_PER_VARIANT.light;

const RANGES = {
  afterglowMs: { min: 800, max: 6000 },
  ringWidthPx: { min: 1, max: 6 },
  glowIntensity: { min: 0, max: 100 },
} as const;

/** Defaults „na zewnątrz" — gdy konsument potrzebuje resetu w UI. */
export function getDefaultFocusPrefsByVariant(): FocusPrefsByVariant {
  return {
    light: { ...DEFAULTS_PER_VARIANT.light },
    dark: { ...DEFAULTS_PER_VARIANT.dark },
    hc: { ...DEFAULTS_PER_VARIANT.hc },
  };
}

/** Clamp + walidacja typu — chroni przed NaN/string/poza zakresem (wspólne z UI). */
function clamp(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/** Bezpieczna sanityzacja częściowego obiektu prefs → pełny FocusPrefs (defaults dla brakujących). */
export function sanitizeFocusPrefs(input: unknown, fallback: FocusPrefs = DEFAULTS): FocusPrefs {
  const obj = (input && typeof input === "object" ? input : {}) as Partial<FocusPrefs>;
  return {
    afterglowMs: clamp(obj.afterglowMs, RANGES.afterglowMs.min, RANGES.afterglowMs.max, fallback.afterglowMs),
    ringWidthPx: clamp(obj.ringWidthPx, RANGES.ringWidthPx.min, RANGES.ringWidthPx.max, fallback.ringWidthPx),
    glowIntensity: clamp(obj.glowIntensity, RANGES.glowIntensity.min, RANGES.glowIntensity.max, fallback.glowIntensity),
  };
}

/**
 * Sanityzuj częściowy/legacy obiekt → pełny `FocusPrefsByVariant`.
 *
 * Akceptowane wejścia:
 *  - `{ light, dark, hc }` (per-variant, v2) — sanityzuje każdy variant oddzielnie.
 *    Brakujące varianty dostają default per-variant.
 *  - `{ afterglowMs, ringWidthPx, glowIntensity }` (legacy, v1) — replikuje wartości
 *    do WSZYSTKICH 3 wariantów (back-compat: stary user który ustawił prefs przed v2
 *    nie traci konfiguracji, dostaje jednolity styl, może go potem zróżnicować).
 *  - `null` / `undefined` / non-object — czyste defaulty per-variant.
 */
export function sanitizeFocusPrefsByVariant(input: unknown): FocusPrefsByVariant {
  if (!input || typeof input !== "object") return getDefaultFocusPrefsByVariant();
  const obj = input as Record<string, unknown>;

  // Legacy v1: rozpoznajemy po obecności bezpośrednich pól FocusPrefs i braku `light`/`dark`/`hc`.
  const isLegacyShape =
    !("light" in obj) && !("dark" in obj) && !("hc" in obj) &&
    ("afterglowMs" in obj || "ringWidthPx" in obj || "glowIntensity" in obj);
  if (isLegacyShape) {
    const legacy = sanitizeFocusPrefs(obj);
    return { light: { ...legacy }, dark: { ...legacy }, hc: { ...legacy } };
  }

  // v2 shape: per-variant, brakujące → defaulty per-variant.
  return {
    light: sanitizeFocusPrefs(obj.light, DEFAULTS_PER_VARIANT.light),
    dark: sanitizeFocusPrefs(obj.dark, DEFAULTS_PER_VARIANT.dark),
    hc: sanitizeFocusPrefs(obj.hc, DEFAULTS_PER_VARIANT.hc),
  };
}

/**
 * Serializuj per-variant prefs do pretty-printed JSON gotowego do zapisu w pliku.
 * Format v2: `{ version: 2, exportedAt, variants }` — ułatwia parsowanie ręczne.
 */
export function exportFocusPrefsToJson(
  prefs: FocusPrefsByVariant,
  now: Date = new Date(),
): string {
  const payload: FocusPrefsExportV2 = {
    version: 2,
    exportedAt: now.toISOString(),
    variants: sanitizeFocusPrefsByVariant(prefs),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Parsuj string JSON z pliku eksportu → `FocusPrefsByVariant` (sanityzowane).
 *
 * Akceptuje 3 formaty:
 *  - v2: `{ version: 2, variants: { light, dark, hc } }` — current.
 *  - v1: `{ version: 1, prefs: {…} }` — replikuje single-prefs do 3 wariantów.
 *  - legacy plain: `{ afterglowMs, ringWidthPx, glowIntensity }` — j.w.
 *
 * Rzuca tylko gdy parse JSON failuje.
 */
export function importFocusPrefsFromJson(text: string): FocusPrefsByVariant {
  const parsed: unknown = JSON.parse(text);
  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if ("variants" in obj) {
      return sanitizeFocusPrefsByVariant(obj.variants);
    }
    if ("prefs" in obj) {
      // v1 → replikacja do 3 wariantów
      return sanitizeFocusPrefsByVariant(obj.prefs);
    }
  }
  return sanitizeFocusPrefsByVariant(parsed);
}

// ============================================================================
// URL fragment (base64url)
// ============================================================================

/** base64 → base64url (bez `=` paddingu, `+`→`-`, `/`→`_`). URL-safe. */
function toBase64Url(s: string): string {
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** base64url → standardowy base64 (re-add padding, `-`→`+`, `_`→`/`). */
function fromBase64Url(s: string): string {
  const padded = s + "=".repeat((4 - (s.length % 4)) % 4);
  return padded.replace(/-/g, "+").replace(/_/g, "/");
}

function base64Encode(json: string): string {
  return typeof btoa !== "undefined"
    ? btoa(json)
    : Buffer.from(json, "utf-8").toString("base64");
}
function base64Decode(b64: string): string {
  return typeof atob !== "undefined"
    ? atob(b64)
    : Buffer.from(b64, "base64").toString("utf-8");
}

/**
 * Enkoduj per-variant prefs jako kompaktowy base64url do `#focus-prefs=<encoded>`.
 *
 * Format wewnętrzny: `{ v: 2, l, d, h }` (krótkie nazwy klucze) zamiast pełnego
 * `{ version, variants: { light, dark, hc } }` żeby fragment był ~40 znaków
 * krótszy (ważne dla wklejania w komunikator). Decode rozpoznaje oba formaty
 * przez obecność `v: 2` — jest forward-compatible z ewentualnym v3.
 */
export function encodeFocusPrefsToFragment(prefs: FocusPrefsByVariant): string {
  const sanitized = sanitizeFocusPrefsByVariant(prefs);
  // Compact shape: pojedyncze litery + array [afterglowMs, ringWidthPx, glowIntensity]
  // żeby zredukować długość ~30%. Decoder rozpoznaje go po `v: 2`.
  const compact = {
    v: 2,
    l: [sanitized.light.afterglowMs, sanitized.light.ringWidthPx, sanitized.light.glowIntensity],
    d: [sanitized.dark.afterglowMs, sanitized.dark.ringWidthPx, sanitized.dark.glowIntensity],
    h: [sanitized.hc.afterglowMs, sanitized.hc.ringWidthPx, sanitized.hc.glowIntensity],
  };
  return toBase64Url(base64Encode(JSON.stringify(compact)));
}

/**
 * Dekoduj base64url z URL fragmentu → `FocusPrefsByVariant`.
 *
 * Akceptuje 3 formaty (back-compat ze starymi linkami v1):
 *  - compact v2: `{ v: 2, l: [a,r,g], d: [...], h: [...] }`
 *  - verbose: `{ light, dark, hc }`
 *  - legacy v1: `{ afterglowMs, ringWidthPx, glowIntensity }` — replikuje do 3 wariantów.
 *
 * Zwraca `null` gdy fragment uszkodzony (zły base64, zły JSON).
 */
export function decodeFocusPrefsFromFragment(encoded: string): FocusPrefsByVariant | null {
  try {
    const json = base64Decode(fromBase64Url(encoded));
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      // Compact v2 shape — rozwiń arrays do FocusPrefs.
      if (obj.v === 2 && Array.isArray(obj.l) && Array.isArray(obj.d) && Array.isArray(obj.h)) {
        const expand = (arr: unknown[]): Partial<FocusPrefs> => ({
          afterglowMs: typeof arr[0] === "number" ? arr[0] : NaN,
          ringWidthPx: typeof arr[1] === "number" ? arr[1] : NaN,
          glowIntensity: typeof arr[2] === "number" ? arr[2] : NaN,
        });
        return sanitizeFocusPrefsByVariant({
          light: expand(obj.l),
          dark: expand(obj.d),
          hc: expand(obj.h),
        });
      }
    }
    return sanitizeFocusPrefsByVariant(parsed);
  } catch {
    return null;
  }
}

/**
 * Ekstraktuj per-variant prefs z `window.location.hash` jeśli zawiera `#focus-prefs=...`.
 * Tolerancja na hash łączony z innymi kluczami (`#x=1&focus-prefs=...`).
 * Zwraca `null` gdy fragmentu nie ma lub jest uszkodzony.
 */
export function extractFocusPrefsFromHash(hash: string): FocusPrefsByVariant | null {
  if (!hash) return null;
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  const parts = clean.split("&");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq);
    if (key === "focus-prefs") {
      const value = part.slice(eq + 1);
      return decodeFocusPrefsFromFragment(value);
    }
  }
  return null;
}

/** Zbuduj pełny URL z aktualnej lokalizacji + #focus-prefs=... do skopiowania. */
export function buildFocusPrefsShareUrl(prefs: FocusPrefsByVariant, baseUrl: string): string {
  const encoded = encodeFocusPrefsToFragment(prefs);
  const hashIdx = baseUrl.indexOf("#");
  const base = hashIdx === -1 ? baseUrl : baseUrl.slice(0, hashIdx);
  return `${base}#focus-prefs=${encoded}`;
}
