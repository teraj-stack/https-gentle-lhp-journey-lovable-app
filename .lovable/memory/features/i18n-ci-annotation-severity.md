---
name: i18n CI annotation severity
description: emitGithubAnnotations (src/lib/i18nGithubAnnotations.ts) emits ::error or ::warning per violation; classifyReasonSeverity maps reason→severity. Default warning-only reason: empty-optional-value. Per-violation severity override supported via AnnotatableViolation.severity.
type: feature
---
GitHub PR annotations from i18n contract tests now carry severity:

- `::error` (default) — fails the build. Used for missing-required-key, empty-required-value, wrong-type, undeclared-key, placeholder/aria mismatches, etc.
- `::warning` — yellow marker only, does NOT fail the check. Used for advisory drift signals.

Severity is decided by `classifyReasonSeverity(reason)` in `src/lib/i18nGithubAnnotations.ts`. The only warning-by-default reason currently is `empty-optional-value` (set in `WARNING_REASONS`). Add new advisory reasons there — keep the set conservative (over-failing is safer than silently downgrading a real bug).

Callers can override per-violation by setting `severity: "error" | "warning"` on the violation object. Title becomes `<group> [error|warning]: <locale> · <reason>` and message includes `severity=...` for grep-ability.

Tests: `src/lib/i18nGithubAnnotations.test.ts` covers classifier table, mixed-batch emission, and per-violation overrides.
