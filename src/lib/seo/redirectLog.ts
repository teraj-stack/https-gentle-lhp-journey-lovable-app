/**
 * Logger trafień w SeoRedirect i 404 — dwupoziomowy:
 *
 *  1. **Lokalny** (sessionStorage) — szybka diagnostyka w devtools / `/dev/seo-redirects`.
 *  2. **Zdalny** (Supabase: `seo_redirect_hits`) — analityka cross-session, pokazuje
 *     które stare URL-e / literówki realnie generują ruch. Widoczna w `/admin/seo-redirects`.
 *
 * Deduplikacja zdalna: per (session_id, kind, from_path) — jeden wpis na sesję na ścieżkę,
 * żeby nie spamować analityki przy każdym remoutncie SeoRedirect.
 *
 * Wysyłka: `navigator.sendBeacon` (przeżyje unload przy redirect), fallback `fetch keepalive`.
 * Failure-tolerant: błędy sieci / brak supabase NIE blokują UX.
 */
// Klient backendu ładowany dynamicznie — ten moduł jest w bundlu wejściowym,
// a supabase-js (~46 kB gzip) nie jest potrzebny do pierwszego renderu.

export type RedirectLogKind = "redirect" | "not_found" | "suggested";

export interface RedirectLogEntry {
  kind: RedirectLogKind;
  /** Ścieżka z `location.pathname` w momencie trafienia. */
  from: string;
  /** Cel redirect (tylko dla `kind="redirect"`). */
  to?: string;
  /** ISO timestamp (Date.now() → toISOString). */
  timestamp: string;
  /** `document.referrer` lub "(direct)". */
  referrer: string;
  /** Search string z momentu trafienia (np. "?utm_source=fb"). */
  search: string;
}

const STORAGE_KEY = "cml:seo-redirect-log:v1";
const SESSION_ID_KEY = "cml:seo-redirect-session:v1";
const REMOTE_DEDUP_KEY = "cml:seo-redirect-remote-sent:v1";
const MAX_ENTRIES = 500;

/** Listenery do reaktywnego UI (ekran debug). */
type Listener = (entries: RedirectLogEntry[]) => void;
const listeners = new Set<Listener>();

/** Override sinka zdalnego — wykorzystywane w testach jednostkowych. */
let remoteSinkOverride: ((payload: RemotePayload) => void) | null = null;

interface RemotePayload {
  kind: RedirectLogKind;
  from_path: string;
  to_path: string | null;
  referrer: string | null;
  search: string | null;
  user_agent: string | null;
  session_id: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

/** Pseudo-anonimowy ID sesji per karta przeglądarki — pozwala dedupować po stronie agregacji. */
function getSessionId(): string {
  if (!isBrowser()) return "ssr";
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_ID_KEY, fresh);
    return fresh;
  } catch {
    return `s_${Date.now()}`;
  }
}

/** Czy w tej sesji już wysłaliśmy zdalnie ten (kind, from)? Chroni przed duplikatami przy remount. */
function isRemoteAlreadySent(kind: RedirectLogKind, from: string): boolean {
  if (!isBrowser()) return true;
  try {
    const raw = sessionStorage.getItem(REMOTE_DEDUP_KEY);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    return set.has(`${kind}|${from}`);
  } catch {
    return false;
  }
}

function markRemoteSent(kind: RedirectLogKind, from: string): void {
  if (!isBrowser()) return;
  try {
    const raw = sessionStorage.getItem(REMOTE_DEDUP_KEY);
    const arr: string[] = raw ? JSON.parse(raw) : [];
    arr.push(`${kind}|${from}`);
    // Cap, żeby nie rosło w nieskończoność (np. bot scanujący /xxx, /yyy…).
    sessionStorage.setItem(REMOTE_DEDUP_KEY, JSON.stringify(arr.slice(-200)));
  } catch {
    // ignore
  }
}

/** Wyślij hit do `seo_redirect_hits`. Best-effort, błędy nie blokują UX. */
async function sendRemote(payload: RemotePayload): Promise<void> {
  if (remoteSinkOverride) {
    remoteSinkOverride(payload);
    return;
  }
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { error } = await supabase.from("seo_redirect_hits").insert(payload);
    if (error && isBrowser()) {
      console.debug("[redirectLog] remote insert failed:", error.message);
    }
  } catch (err) {
    if (isBrowser()) console.debug("[redirectLog] remote insert exception:", err);
  }
}

function readAll(): RedirectLogEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RedirectLogEntry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: RedirectLogEntry[]): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // QuotaExceeded / privacy mode — ignorujemy, log jest „best effort".
  }
  for (const l of listeners) l(entries);
}

function append(entry: Omit<RedirectLogEntry, "timestamp" | "referrer" | "search">): void {
  const enriched: RedirectLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
    referrer: isBrowser() ? document.referrer || "(direct)" : "(ssr)",
    search: isBrowser() ? window.location.search : "",
  };
  const all = readAll();
  all.push(enriched);
  writeAll(all);

  // Konsola — ułatwia debug w devtools nawet bez ekranu /dev.
  if (isBrowser()) {
    const tag =
      entry.kind === "redirect" ? "[SeoRedirect]"
      : entry.kind === "suggested" ? "[NotFound→suggested]"
      : "[404]";
    if (entry.kind === "redirect" || entry.kind === "suggested") {
      console.info(`${tag} ${entry.from} → ${entry.to}`);
    } else {
      console.warn(`${tag} ${entry.from} (referrer=${enriched.referrer})`);
    }
  }

  // ── Zdalne logowanie do analityki (Supabase) ────────────────────────────
  // Deduplikacja per sesja: jeden wpis na (kind, from), żeby nie spamować przy
  // wielokrotnych mountach SeoRedirect (np. React StrictMode w dev).
  if (isBrowser() && !isRemoteAlreadySent(entry.kind, entry.from)) {
    markRemoteSent(entry.kind, entry.from);
    void sendRemote({
      kind: entry.kind,
      from_path: entry.from,
      to_path: entry.to ?? null,
      referrer: enriched.referrer,
      search: enriched.search || null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null,
      session_id: getSessionId(),
    });
  }
}

/** Zaloguj trafienie w SeoRedirect. */
export function logRedirectHit(from: string, to: string): void {
  append({ kind: "redirect", from, to });
}

/** Zaloguj trafienie w NotFound. */
export function logNotFoundHit(from: string): void {
  append({ kind: "not_found", from });
}

/** Zaloguj fuzzy-match z NotFound (wykryta literówka skierowana do najbliższego aliasu). */
export function logSuggestedRedirectHit(from: string, to: string): void {
  append({ kind: "suggested", from, to });
}

/** Zwróć wszystkie zalogowane wpisy (kopia). */
export function getRedirectLog(): RedirectLogEntry[] {
  return readAll().slice();
}

/** Wyczyść log (dla przycisku „Reset" w UI debug). */
export function clearRedirectLog(): void {
  writeAll([]);
}

/** Subskrybuj zmiany — wraca funkcja anulująca subskrypcję. */
export function subscribeRedirectLog(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test-only: reset stanu modułu i dedup-cache zdalnego logowania. */
export function __resetRedirectLogForTesting(): void {
  writeAll([]);
  if (isBrowser()) {
    try {
      sessionStorage.removeItem(REMOTE_DEDUP_KEY);
      sessionStorage.removeItem(SESSION_ID_KEY);
    } catch {
      // ignore
    }
  }
  remoteSinkOverride = null;
}

/** Test-only: podstaw mock zamiast prawdziwego Supabase insert. */
export function __setRemoteSinkForTesting(sink: ((p: RemotePayload) => void) | null): void {
  remoteSinkOverride = sink;
}
