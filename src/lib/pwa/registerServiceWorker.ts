/**
 * Single, guarded registrar for the offline service worker (`/sw.js`).
 *
 * Service workers are browser-held state: registering them inside the Lovable
 * preview/iframe or in dev can keep serving stale HTML and deleted chunks.
 * Therefore registration happens ONLY in a production, top-level, non-preview
 * context. In every refused context we actively unregister a matching worker.
 */

const SW_URL = "/sw.js";

function isPreviewHost(hostname: string): boolean {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

function shouldRegister(): boolean {
  if (!import.meta.env.PROD) return false;
  if (typeof window === "undefined") return false;
  if (window.top !== window.self) return false; // inside an iframe
  if (isPreviewHost(window.location.hostname)) return false;
  if (new URLSearchParams(window.location.search).has("sw")) {
    // `?sw=off` kill switch (any value disables, per convention `?sw=off`)
    return false;
  }
  return true;
}

async function unregisterExisting(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL ?? "").endsWith(SW_URL))
      .map((r) => r.unregister()),
  );
}

export function registerServiceWorker(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  if (!shouldRegister()) {
    void unregisterExisting().catch(() => {
      /* best effort */
    });
    return;
  }

  void import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      /* offline support is optional — never break app boot */
    });
}
