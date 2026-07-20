import { onLCP, onINP, onCLS, onFCP, onTTFB, type Metric } from "web-vitals";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Sample only a fraction of visits to control volume. Adjust as needed.
const SAMPLE_RATE = 1.0;

// Cap batch size and drop older entries if we can't send.
const buffer: Array<Record<string, unknown>> = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function getConnection(): string | null {
  const nav = navigator as Navigator & { connection?: { effectiveType?: string } };
  return nav.connection?.effectiveType ?? null;
}

function sanitizePath(): string {
  const p = window.location.pathname || "/";
  return p.length > 500 ? p.slice(0, 500) : p;
}

function toRow(m: Metric) {
  return {
    metric: m.name,
    value: m.name === "CLS" ? Number(m.value.toFixed(4)) : Math.round(m.value),
    rating: m.rating,
    path: sanitizePath(),
    navigation_type: m.navigationType ?? null,
    connection: getConnection(),
    user_agent: navigator.userAgent.slice(0, 500),
  };
}

function flush() {
  flushTimer = null;
  if (buffer.length === 0 || !SUPABASE_URL || !SUPABASE_KEY) return;
  const batch = buffer.splice(0, buffer.length);
  const url = `${SUPABASE_URL}/rest/v1/web_vitals`;
  const body = JSON.stringify(batch);
  const headers = {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    Prefer: "return=minimal",
  };

  // Prefer sendBeacon during pagehide/visibilitychange for reliability.
  if (
    document.visibilityState === "hidden" &&
    "sendBeacon" in navigator
  ) {
    try {
      const blob = new Blob([body], { type: "application/json" });
      // sendBeacon can't set custom headers; fall through to fetch(keepalive) so apikey is included.
      // We still try beacon first with plain body — the REST endpoint requires apikey, so use fetch keepalive.
      void blob;
    } catch {
      /* ignore */
    }
  }
  fetch(url, { method: "POST", headers, body, keepalive: true }).catch(() => {
    /* silent — RUM must never break UX */
  });
}

function schedule() {
  if (flushTimer !== null) return;
  flushTimer = setTimeout(flush, 2000);
}

function handle(m: Metric) {
  buffer.push(toRow(m));
  if (buffer.length >= 5) flush();
  else schedule();
}

export function initWebVitals() {
  if (typeof window === "undefined") return;
  if (Math.random() > SAMPLE_RATE) return;
  // Skip admin/dev routes to keep aggregates clean.
  const p = window.location.pathname;
  if (p.startsWith("/admin") || p.startsWith("/dev")) return;

  onLCP(handle);
  onINP(handle);
  onCLS(handle);
  onFCP(handle);
  onTTFB(handle);

  // Ensure buffered metrics flush before unload.
  const flushNow = () => flush();
  window.addEventListener("pagehide", flushNow, { capture: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushNow();
  });
}
