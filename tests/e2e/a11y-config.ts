import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export type AxeImpact = "minor" | "moderate" | "serious" | "critical";

export interface A11yConfig {
  tags: string[];
  disabledRules: string[];
  criticalRules: string[];
  warningRules: string[];
  failImpacts: AxeImpact[];
}

const DEFAULT_CONFIG: A11yConfig = {
  tags: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  disabledRules: [],
  criticalRules: [],
  warningRules: [],
  failImpacts: ["serious", "critical"],
};

const CONFIG_PATH = resolve(process.cwd(), "tests/e2e/a11y-config.json");
const OVERRIDE_PATH = process.env.A11Y_CONFIG
  ? resolve(process.cwd(), process.env.A11Y_CONFIG)
  : null;

function readJson(path: string): Partial<A11yConfig> {
  const raw = readFileSync(path, "utf8");
  // Strip JSON comments-in-doc if the user accidentally left `_doc` etc — JSON.parse handles it natively.
  return JSON.parse(raw) as Partial<A11yConfig>;
}

export function loadA11yConfig(): A11yConfig {
  const merged: A11yConfig = { ...DEFAULT_CONFIG };

  const paths = [CONFIG_PATH, OVERRIDE_PATH].filter((p): p is string => !!p && existsSync(p));
  for (const p of paths) {
    const partial = readJson(p);
    if (Array.isArray(partial.tags)) merged.tags = partial.tags;
    if (Array.isArray(partial.disabledRules)) merged.disabledRules = partial.disabledRules;
    if (Array.isArray(partial.criticalRules)) merged.criticalRules = partial.criticalRules;
    if (Array.isArray(partial.warningRules)) merged.warningRules = partial.warningRules;
    if (Array.isArray(partial.failImpacts)) merged.failImpacts = partial.failImpacts as AxeImpact[];
  }

  // Env overrides — CSV lists layered on top of file config.
  const csv = (name: string) =>
    (process.env[name] || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const envCritical = csv("AXE_CRITICAL_RULES");
  const envWarning = csv("AXE_WARNING_RULES");
  const envDisabled = csv("AXE_DISABLED_RULES");

  if (envCritical.length) merged.criticalRules = [...new Set([...merged.criticalRules, ...envCritical])];
  if (envWarning.length) merged.warningRules = [...new Set([...merged.warningRules, ...envWarning])];
  if (envDisabled.length) merged.disabledRules = [...new Set([...merged.disabledRules, ...envDisabled])];

  // AXE_STRICT=1 promotes minor+moderate into the failing set for rules that fall through
  // to impact-based classification. It never overrides warningRules.
  if (process.env.AXE_STRICT === "1") {
    merged.failImpacts = ["minor", "moderate", "serious", "critical"];
  }

  return merged;
}

/**
 * Given an axe violation, decide whether it should FAIL the build.
 *
 * Precedence (highest first):
 *   1. disabledRules — already filtered upstream via AxeBuilder.disableRules(), so
 *      these never reach here; kept in signature for completeness.
 *   2. warningRules  — never fail, regardless of axe-reported impact.
 *   3. criticalRules — always fail, regardless of axe-reported impact.
 *   4. failImpacts   — fail if the axe impact is in the configured set.
 */
export function classifyViolation(
  ruleId: string,
  impact: string | null | undefined,
  cfg: A11yConfig,
): "blocking" | "advisory" {
  if (cfg.warningRules.includes(ruleId)) return "advisory";
  if (cfg.criticalRules.includes(ruleId)) return "blocking";
  return cfg.failImpacts.includes((impact ?? "") as AxeImpact) ? "blocking" : "advisory";
}
