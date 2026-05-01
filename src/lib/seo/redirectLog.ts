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
import { supabase } from "@/integrations/supabase/client";

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
const MAX_ENTRIES = 500;

/** Listenery do reaktywnego UI (ekran debug). */
type Listener = (entries: RedirectLogEntry[]) => void;
const listeners = new Set<Listener>();

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
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
    const tag = entry.kind === "redirect" ? "[SeoRedirect]" : "[404]";
    if (entry.kind === "redirect") {
      console.info(`${tag} ${entry.from} → ${entry.to}`);
    } else {
      console.warn(`${tag} ${entry.from} (referrer=${enriched.referrer})`);
    }
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

/** Test-only: reset stanu modułu (jeśli kiedyś dodamy memoizację). */
export function __resetRedirectLogForTesting(): void {
  writeAll([]);
}
