/**
 * EBM Click Analytics — frontend-only, privacy-first.
 *
 * Co śledzimy:
 *  - kliknięcia w linki do badań (PubMed, Cochrane, NICE, ASCRS, ESCP, journals)
 *  - kliknięcia w deep-linki kotwic bibliografii (#ebm-<categoryId>, #bibliografia)
 *
 * Gdzie zapisujemy:
 *  - localStorage (klucz `cml.ebm.analytics.v1`) — agregaty + ostatnie zdarzenia
 *  - window.dataLayer.push (jeżeli istnieje) — gotowe pod GA4 / GTM bez zmian kodu
 *  - CustomEvent("cml:ebm-click") na window — pozwala podpiąć inne integracje
 *
 * Brak ciasteczek, brak PII, brak zewnętrznych żądań sieciowych.
 */

const STORAGE_KEY = "cml.ebm.analytics.v1";
const MAX_RECENT_EVENTS = 200;

export type EbmClickKind = "external_source" | "internal_anchor";

export type EbmClickEvent = {
  /** ISO timestamp */
  ts: string;
  kind: EbmClickKind;
  /** Pełny URL docelowy (PubMed/Cochrane/itd. albo /dla-pacjenta/ebm-hemoroidy#ebm-...) */
  url: string;
  /** Domena docelowa (np. pubmed.ncbi.nlm.nih.gov) — dla agregatów */
  host: string;
  /** Krótki tytuł / etykieta linka */
  label: string;
  /** Skąd kliknięto (np. "RiskFactorsAccordion", "RedFlagsFAQ", "EBMSourcesSection") */
  source: string;
  /** Opcjonalny id kategorii bibliografii EBM (np. "guidelines", "fiber") */
  ebmId?: string;
  /** URL strony, na której kliknięto */
  page: string;
};

export type EbmAnalyticsState = {
  version: 1;
  totals: {
    external_source: number;
    internal_anchor: number;
  };
  /** Counts per host (np. pubmed.ncbi.nlm.nih.gov: 12) */
  perHost: Record<string, number>;
  /** Counts per ebmId (np. fiber: 4) */
  perEbmId: Record<string, number>;
  /** Counts per source component (np. RiskFactorsAccordion: 8) */
  perSource: Record<string, number>;
  /** Najnowsze zdarzenia (max 200) */
  recent: EbmClickEvent[];
};

const freshState = (): EbmAnalyticsState => ({
  version: 1,
  totals: { external_source: 0, internal_anchor: 0 },
  perHost: {},
  perEbmId: {},
  perSource: {},
  recent: [],
});

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

const safeRead = (): EbmAnalyticsState => {
  if (!isBrowser()) return freshState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return freshState();
    const base = freshState();
    return {
      ...base,
      ...parsed,
      totals: { ...base.totals, ...(parsed.totals ?? {}) },
      perHost: parsed.perHost ?? {},
      perEbmId: parsed.perEbmId ?? {},
      perSource: parsed.perSource ?? {},
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
    };
  } catch {
    return freshState();
  }
};

const safeWrite = (state: EbmAnalyticsState) => {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded — ignore */
  }
};

const extractHost = (url: string): string => {
  try {
    if (url.startsWith("/") || url.startsWith("#")) {
      return isBrowser() ? window.location.host : "internal";
    }
    return new URL(url).host;
  } catch {
    return "unknown";
  }
};

export type TrackEbmClickArgs = {
  url: string;
  label: string;
  source: string;
  kind?: EbmClickKind;
  ebmId?: string;
};

/**
 * Zapisuje kliknięcie w linka do badania / kotwicy bibliografii.
 * Bezpieczne do użycia w `onClick` (synchroniczne, idempotentne, brak rzutów).
 */
export const trackEbmClick = ({ url, label, source, kind, ebmId }: TrackEbmClickArgs): void => {
  if (!isBrowser()) return;

  const host = extractHost(url);
  const resolvedKind: EbmClickKind =
    kind ?? (url.startsWith("/") || url.startsWith("#") ? "internal_anchor" : "external_source");

  const event: EbmClickEvent = {
    ts: new Date().toISOString(),
    kind: resolvedKind,
    url,
    host,
    label: label.slice(0, 200),
    source,
    ebmId,
    page: window.location.pathname + window.location.hash,
  };

  // 1) localStorage aggregate
  const state = safeRead();
  state.totals[resolvedKind] = (state.totals[resolvedKind] ?? 0) + 1;
  state.perHost[host] = (state.perHost[host] ?? 0) + 1;
  if (ebmId) state.perEbmId[ebmId] = (state.perEbmId[ebmId] ?? 0) + 1;
  state.perSource[source] = (state.perSource[source] ?? 0) + 1;
  state.recent.unshift(event);
  if (state.recent.length > MAX_RECENT_EVENTS) {
    state.recent.length = MAX_RECENT_EVENTS;
  }
  safeWrite(state);

  // 2) GA4 / GTM — push do dataLayer jeżeli istnieje (zero-config integracja)
  try {
    type DataLayerWindow = Window & { dataLayer?: Array<Record<string, unknown>> };
    const w = window as DataLayerWindow;
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({
        event: "ebm_click",
        ebm_kind: resolvedKind,
        ebm_url: url,
        ebm_host: host,
        ebm_label: event.label,
        ebm_source: source,
        ebm_id: ebmId ?? null,
        ebm_page: event.page,
      });
    }
  } catch {
    /* noop */
  }

  // 3) CustomEvent dla integracji backendowych / własnych nasłuchów
  try {
    window.dispatchEvent(new CustomEvent("cml:ebm-click", { detail: event }));
  } catch {
    /* noop */
  }
};

export const readEbmAnalytics = (): EbmAnalyticsState => safeRead();

export const resetEbmAnalytics = (): void => {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
};
