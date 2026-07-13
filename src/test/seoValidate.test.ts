import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * Smoke test: runs the same static SEO validator that `prebuild` runs.
 * Guarantees CI catches head-meta / robots / sitemap regressions
 * even if a developer runs `vite dev` and skips a full build locally.
 * The script exits 0 on success, non-zero on any error.
 */
describe("scripts/seo-validate.mjs", () => {
  it("passes static SEO validation on the current project", () => {
    const script = resolve(__dirname, "../scripts/seo-validate.mjs");
    let out = "";
    let code = 0;
    try {
      out = execSync(`node ${script}`, { encoding: "utf8", stdio: "pipe" });
    } catch (e: any) {
      code = e.status ?? 1;
      out = (e.stdout?.toString() ?? "") + (e.stderr?.toString() ?? "");
    }
    if (code !== 0) console.error(out);
    expect(code, out).toBe(0);
    expect(out).toMatch(/0 error\(s\)/);
  }, 20_000);
});
