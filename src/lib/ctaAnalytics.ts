/**
 * CTA Click Analytics — frontend-only, privacy-first.
 *
 * Spójny ze `ebmAnalytics.ts` wzorzec:
 *  - window.dataLayer.push (GA4 / GTM, zero-config jeśli kontener istnieje)
 *  - CustomEvent("cml:cta-click") dla własnych nasłuchów
 *  - opcjonalny zrzut do localStorage (debug / QA)
 *
 * Brak ciasteczek, brak PII, brak zewnętrznych żądań sieciowych.
 */

const STORAGE_KEY = "cml.cta.analytics.v1";
const MAX_RECENT_EVENTS = 100;

export type CtaCampaign = {
  /** utm_source — np. "site" */
  source: string;
  /** utm_medium — np. "cta_hero" */
  medium: string;
  /** utm_campaign — np. "home_hero_booking" */
  campaign: string;
  /** utm_content — np. "umow_konsultacje" */
  content?: string;
  /** utm_term — opcjonalnie */
  term?: string;
};

export type CtaClickEvent = {
  ts: string;
  /** Stabilne id CTA (np. "home_hero_book_consultation") */
  id: string;
  /** Etykieta widoczna dla użytkownika */
  label: string;
  /** Skąd kliknięto (np. "DoctorSection") */
  source: string;
  /** Pełny URL docelowy (już z UTM jeśli zewnętrzny) */
  url: string;
  /** Domena docelowa */
  host: string;
  /** Strona, na której kliknięto */
  page: string;
  campaign?: CtaCampaign;
};

const isBrowser = () =>
  typeof window !== "undefined" && typeof localStorage !== "undefined";

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

/**
 * Dokleja parametry UTM do zewnętrznego URL-a (http/https).
 * Dla linków wewnętrznych / mailto / tel zwraca URL bez zmian.
 * Nie nadpisuje już istniejących parametrów utm_*.
 */
export const appendUtmParams = (url: string, campaign?: CtaCampaign): string => {
  if (!campaign) return url;
  if (!/^https?:/i.test(url)) return url;
  try {
    const u = new URL(url);
    const set = (key: string, value: string | undefined) => {
      if (value && !u.searchParams.has(key)) u.searchParams.set(key, value);
    };
    set("utm_source", campaign.source);
    set("utm_medium", campaign.medium);
    set("utm_campaign", campaign.campaign);
    set("utm_content", campaign.content);
    set("utm_term", campaign.term);
    return u.toString();
  } catch {
    return url;
  }
};

export type TrackCtaClickArgs = {
  id: string;
  label: string;
  source: string;
  url: string;
  campaign?: CtaCampaign;
};

export const trackCtaClick = ({ id, label, source, url, campaign }: TrackCtaClickArgs): void => {
  if (!isBrowser()) return;

  const event: CtaClickEvent = {
    ts: new Date().toISOString(),
    id,
    label: label.slice(0, 200),
    source,
    url,
    host: extractHost(url),
    page: window.location.pathname + window.location.hash,
    campaign,
  };

  // 1) localStorage (debug ring buffer)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const recent: CtaClickEvent[] = raw ? JSON.parse(raw) : [];
    recent.unshift(event);
    if (recent.length > MAX_RECENT_EVENTS) recent.length = MAX_RECENT_EVENTS;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recent));
  } catch {
    /* quota / json — ignore */
  }

  // 2) dataLayer (GA4 / GTM)
  try {
    type DataLayerWindow = Window & { dataLayer?: Array<Record<string, unknown>> };
    const w = window as DataLayerWindow;
    if (Array.isArray(w.dataLayer)) {
      w.dataLayer.push({
        event: "cta_click",
        cta_id: id,
        cta_label: event.label,
        cta_source: source,
        cta_url: url,
        cta_host: event.host,
        cta_page: event.page,
        utm_source: campaign?.source ?? null,
        utm_medium: campaign?.medium ?? null,
        utm_campaign: campaign?.campaign ?? null,
        utm_content: campaign?.content ?? null,
        utm_term: campaign?.term ?? null,
      });
    }
  } catch {
    /* noop */
  }

  // 3) CustomEvent dla integracji
  try {
    window.dispatchEvent(new CustomEvent("cml:cta-click", { detail: event }));
  } catch {
    /* noop */
  }
};

export const readCtaClickLog = (): CtaClickEvent[] => {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CtaClickEvent[]) : [];
  } catch {
    return [];
  }
};

export const resetCtaClickLog = (): void => {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
};
