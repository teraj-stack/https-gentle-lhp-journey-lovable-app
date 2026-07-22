import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { imagetools } from "vite-imagetools";
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
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
