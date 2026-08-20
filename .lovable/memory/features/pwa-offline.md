---
name: PWA Offline Mode
description: Tryb offline (vite-plugin-pwa generateSW, /sw.js) + manifest CML; rejestracja tylko przez guardowany wrapper src/lib/pwa/registerServiceWorker.ts, nigdy w dev/preview
type: feature
---

Offline działa przez `vite-plugin-pwa` (`generateSW`) skonfigurowany w `vite.config.ts`:
- `filename: sw.js`, `registerType: autoUpdate`, `injectRegister: null`, `devOptions.enabled: false`
- HTML navigations → `NetworkFirst` (świeża treść), same-origin hashed assets → `CacheFirst`
- `navigateFallbackDenylist`: `/~oauth`, `/api/`
- Manifest: nazwa „CML – Centrum Medycyny Laserowej”, theme `#c9a84c`, bg `#0f0f11`, ikony `public/pwa-192x192.png` / `pwa-512x512.png` (także maskable)

Rejestracja: WYŁĄCZNIE `src/lib/pwa/registerServiceWorker.ts` (wywoływany w `src/main.tsx`).
Guardy: tylko PROD, nie w iframe, nie na hostach preview Lovable, kill-switch `?sw=off` — w odrzuconych kontekstach robi `unregister()` dla `/sw.js`.

Offline NIE działa w preview Lovable — tylko na opublikowanej stronie (mcml.pro).
