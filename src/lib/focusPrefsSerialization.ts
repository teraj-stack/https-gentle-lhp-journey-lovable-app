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
 * Wszystkie wartości są clampowane do tych samych zakresów co w UI sliderów —
 * gdy ktoś podrzuci URL z `afterglowMs=99999`, dostanie max=6000 zamiast crashu.
 *
 * Wyciągnięte z `AdminSystemHealth.tsx` jako pure-helper żeby pokryć testem
 * jednostkowym (round-trip, walidacja, wersjonowanie).
 */

export interface FocusPrefs {
  /** 800–6000 ms */
  afterglowMs: number;
  /** 1–6 px (HC dodaje +2) */
  ringWidthPx: number;
  /** 0–100 (% intensywności halo) */
  glowIntensity: number;
}

/** Schemat eksportu — wersjonujemy żeby móc bez konfliktu zmienić strukturę. */
export interface FocusPrefsExport {
  version: 1;
  /** ISO 8601 — kiedy eksportowano (informacyjne, nie walidowane przy imporcie) */
  exportedAt: string;
  prefs: FocusPrefs;
}

const DEFAULTS: FocusPrefs = {
  afterglowMs: 2400,
  ringWidthPx: 2,
  glowIntensity: 55,
};

const RANGES = {
  afterglowMs: { min: 800, max: 6000 },
  ringWidthPx: { min: 1, max: 6 },
  glowIntensity: { min: 0, max: 100 },
} as const;

/** Clamp + walidacja typu — chroni przed NaN/string/poza zakresem (wspólne z UI). */
function clamp(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/** Bezpieczna sanityzacja częściowego obiektu prefs → pełny FocusPrefs (defaults dla brakujących). */
export function sanitizeFocusPrefs(input: unknown): FocusPrefs {
  const obj = (input && typeof input === "object" ? input : {}) as Partial<FocusPrefs>;
  return {
    afterglowMs: clamp(obj.afterglowMs, RANGES.afterglowMs.min, RANGES.afterglowMs.max, DEFAULTS.afterglowMs),
    ringWidthPx: clamp(obj.ringWidthPx, RANGES.ringWidthPx.min, RANGES.ringWidthPx.max, DEFAULTS.ringWidthPx),
    glowIntensity: clamp(obj.glowIntensity, RANGES.glowIntensity.min, RANGES.glowIntensity.max, DEFAULTS.glowIntensity),
  };
}

/**
 * Serializuj preferencje do pretty-printed JSON gotowego do zapisu w pliku `.json`.
 * Format: `{ version, exportedAt, prefs }` — ułatwia parsowanie ręcznie / skryptem.
 */
export function exportFocusPrefsToJson(
  prefs: FocusPrefs,
  now: Date = new Date(),
): string {
  const payload: FocusPrefsExport = {
    version: 1,
    exportedAt: now.toISOString(),
    prefs: sanitizeFocusPrefs(prefs),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Parsuj string JSON z pliku eksportu → FocusPrefs (sanityzowane).
 * Akceptuje też legacy format bez `version` (czysty `{afterglowMs, ringWidthPx, glowIntensity}`)
 * — żeby user mógł wkleić ręcznie zlepiony JSON. Rzuca tylko gdy parse JSON failuje.
 */
export function importFocusPrefsFromJson(text: string): FocusPrefs {
  const parsed: unknown = JSON.parse(text);
  if (parsed && typeof parsed === "object" && "prefs" in parsed) {
    return sanitizeFocusPrefs((parsed as FocusPrefsExport).prefs);
  }
  return sanitizeFocusPrefs(parsed);
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

/**
 * Enkoduj prefs jako kompaktowy base64url string nadający się do URL fragmentu
 * `#focus-prefs=<encoded>`. Tylko 3 liczby → typowo ~30-40 znaków.
 *
 * `btoa` operuje na ASCII — bezpiecznie, bo JSON z 3 liczbami nie ma non-ASCII.
 */
export function encodeFocusPrefsToFragment(prefs: FocusPrefs): string {
  const sanitized = sanitizeFocusPrefs(prefs);
  const json = JSON.stringify(sanitized);
  const b64 = typeof btoa !== "undefined"
    ? btoa(json)
    // Node fallback (testy/SSR) — nigdy nie używane w przeglądarce.
    : Buffer.from(json, "utf-8").toString("base64");
  return toBase64Url(b64);
}

/**
 * Dekoduj base64url z URL fragmentu → FocusPrefs.
 * Zwraca `null` gdy fragment jest uszkodzony (zły base64, zły JSON, etc.).
 * Wartości są sanityzowane (clamp do zakresów).
 */
export function decodeFocusPrefsFromFragment(encoded: string): FocusPrefs | null {
  try {
    const b64 = fromBase64Url(encoded);
    const json = typeof atob !== "undefined"
      ? atob(b64)
      : Buffer.from(b64, "base64").toString("utf-8");
    const parsed: unknown = JSON.parse(json);
    return sanitizeFocusPrefs(parsed);
  } catch {
    return null;
  }
}

/**
 * Ekstraktuj prefs z `window.location.hash` jeśli zawiera `#focus-prefs=...`
 * Tolerancja na hash łączony z innymi kluczami (`#x=1&focus-prefs=...`).
 * Zwraca `null` gdy fragmentu nie ma lub jest uszkodzony.
 */
export function extractFocusPrefsFromHash(hash: string): FocusPrefs | null {
  if (!hash) return null;
  const clean = hash.startsWith("#") ? hash.slice(1) : hash;
  // Wspieramy zarówno samodzielne `focus-prefs=ABC`, jak i połączone `a=1&focus-prefs=ABC`.
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
export function buildFocusPrefsShareUrl(prefs: FocusPrefs, baseUrl: string): string {
  const encoded = encodeFocusPrefsToFragment(prefs);
  // Strip istniejący hash, zachowaj path+search, doklej nasz fragment.
  const hashIdx = baseUrl.indexOf("#");
  const base = hashIdx === -1 ? baseUrl : baseUrl.slice(0, hashIdx);
  return `${base}#focus-prefs=${encoded}`;
}
