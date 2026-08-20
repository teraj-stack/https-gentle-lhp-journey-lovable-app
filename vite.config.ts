import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { imagetools } from "vite-imagetools";
import { VitePWA } from "vite-plugin-pwa";
// @ts-expect-error — plain Node ESM script without type declarations
import { validateEbmAnchors } from "./scripts/validate-ebm-anchors.mjs";

/**
 * Build-time guard: every `ebmId` referenced in RiskFactorsAccordion must
 * exist as a category id in EBMSourcesSection. Fails `vite build` and
 * surfaces a warning during `vite dev`.
 */
function ebmAnchorsValidator(): Plugin {
  return {
    name: "cml:validate-ebm-anchors",
    enforce: "pre",
    buildStart() {
      const result = validateEbmAnchors() as {
        validIds: string[];
        refsCount: number;
        orphans: Array<{ id: string; line: number }>;
      };
      if (result.orphans.length === 0) {
        this.info(
          `[ebm-anchors] OK — ${result.refsCount} references match ${result.validIds.length} categories.`,
        );
        return;
      }
      const list = result.orphans
        .map(
          (o) =>
            `  • "${o.id}" (RiskFactorsAccordion.tsx:${o.line})`,
        )
        .join("\n");
      const msg =
        `Orphan ebmId reference(s) — broken deep-links to /dla-pacjenta/ebm-hemoroidy#ebm-<id>:\n${list}\n\n` +
        `Valid category ids: ${result.validIds.join(", ")}\n` +
        `Fix in src/components/blog/RiskFactorsAccordion.tsx OR add the missing Category in src/components/hemoroidy/EBMSourcesSection.tsx.`;
      // `this.error` aborts the build in production, surfaces as overlay/warn in dev.
      this.error(msg);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    ebmAnchorsValidator(),
    // Generates responsive AVIF/WebP variants for imports using `?as=picture`.
    // No-op for imports without the query string, so existing `<img>` refs stay intact.
    imagetools(),
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      // The guarded wrapper in src/lib/pwa/registerServiceWorker.ts is the ONLY registrar.
      injectRegister: null,
      devOptions: { enabled: false },
      filename: "sw.js",
      includeAssets: [
        "favicon.ico",
        "favicon-32x32.png",
        "favicon-16x16.png",
        "apple-touch-icon.png",
        "fonts/*.woff2",
      ],
      manifest: {
        name: "CML – Centrum Medycyny Laserowej",
        short_name: "CML",
        description:
          "Laserowe leczenie hemoroidów, żylaków, przetok i szczelin odbytu — CML Warszawa Wilanów.",
        lang: "pl",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0f0f11",
        theme_color: "#c9a84c",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,ico,png,svg,webp,avif}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: "/index.html",
        // OAuth callbacks must always hit the network.
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
        runtimeCaching: [
          {
            // HTML navigations: always try network first so content stays fresh.
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-navigations",
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
          {
            // Same-origin hashed build assets are immutable.
            urlPattern: ({ url, request, sameOrigin }) =>
              sameOrigin &&
              (request.destination === "script" ||
                request.destination === "style" ||
                request.destination === "font" ||
                request.destination === "image") &&
              !url.pathname.startsWith("/~oauth"),
            handler: "CacheFirst",
            options: {
              cacheName: "static-assets",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Split long-lived vendor code out of the app entry so a content change
    // does not invalidate the whole ~200 kB gzip bundle, and so the browser
    // can download the chunks in parallel (better LCP on cold + repeat visits).
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "vendor-react";
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils"))
            return "vendor-motion";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("@tanstack")) return "vendor-query";
          // Everything else keeps Rollup's default per-import chunking so heavy,
          // route-only libs (recharts, jspdf, html2canvas) stay lazy.
          return undefined;
        },
      },
    },
  },
}));
