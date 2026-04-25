#!/usr/bin/env node
/**
 * scripts/generate-fixture-snippets.mjs
 *
 * Regenerates the "Reproducible source fixtures" subsection of README.md
 * from the validator's REAL input sources, so the documented failure
 * cases never drift from the live implementation.
 *
 * Why this exists
 * ---------------
 * The README hand-rolled five TypeScript snippets that each trip a specific
 * `::error` / `::warning` reason. They referenced the simplified pedagogical
 * shapes (`TRANSLATIONS = { pl: {...}, en: {...} }`) and a flat
 * `REQUIRED_TRANSLATION_KEYS` array. The real exports are richer
 * (bucketed `{top, variant, variantOptional}`, `__getRaw…ForTesting`,
 * `SUPPORTED_LOCALES`, env-driven active-locales scope) — see
 * `mem://features/i18n-validator-actual-exports`. Whenever those exports
 * change, the README went stale.
 *
 * This script reads the real validator constants at generation time and
 * rebuilds the fixture block from a small set of templates parameterised
 * by:
 *   - SOURCE_FILES (file paths embedded in fixture comments)
 *   - SUPPORTED_LOCALES (which locale acts as "missing" / "extra")
 *   - REFERENCE_LOCALE (the source-of-truth language for placeholders)
 *   - REQUIRED_TRANSLATION_KEYS.variant[0] (a real required key)
 *   - REQUIRED_TIME_LINE_KEYS[0] (a real time-line key)
 *
 * Usage
 * -----
 *   node scripts/generate-fixture-snippets.mjs           # rewrite README in place
 *   node scripts/generate-fixture-snippets.mjs --check   # CI mode: exit 1 if stale
 *
 * The README marks the auto-generated region with sentinel HTML comments:
 *   <!-- BEGIN: AUTO-GENERATED FIXTURE SNIPPETS -->
 *   …generated content…
 *   <!-- END: AUTO-GENERATED FIXTURE SNIPPETS -->
 *
 * Hand-edits inside the sentinels are overwritten on the next run. Edit
 * the templates in this file instead.
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..");
const README_PATH = resolve(REPO_ROOT, "README.md");

const BEGIN_MARKER = "<!-- BEGIN: AUTO-GENERATED FIXTURE SNIPPETS -->";
const END_MARKER = "<!-- END: AUTO-GENERATED FIXTURE SNIPPETS -->";

/**
 * Read a constant out of a TS source file by name. Lightweight regex parser
 * — works because the validator inputs follow a consistent shape (no fancy
 * computed exports). Returns the raw RHS string so the caller can JSON.parse
 * it for arrays / object literals it knows are JSON-compatible.
 */
const readExport = async (relPath, exportName) => {
  const src = await readFile(resolve(REPO_ROOT, relPath), "utf8");
  // Match: export const NAME[: Type] = <value>;
  // We capture <value> non-greedily up to the matching top-level `;` at
  // column 0 (assumes prettier-formatted source — safe for this repo).
  const re = new RegExp(
    `export\\s+const\\s+${exportName}(?:\\s*:[^=]+)?\\s*=\\s*([\\s\\S]*?);\\n`,
    "m",
  );
  const m = src.match(re);
  if (!m) throw new Error(`Could not find export "${exportName}" in ${relPath}`);
  return m[1].trim();
};

/**
 * Strip TypeScript-only syntax from a value RHS so JSON.parse can take it:
 *  - inline AND trailing `as const` suffixes (any depth)
 *  - `satisfies <Type>` clauses (TS 4.9+) including generic type args
 *  - trailing commas inside arrays/objects
 *  - single-quoted strings → double-quoted
 *  - bare identifier object keys → quoted (JSON requires string keys)
 *  - line comments (`// …`) — none in our inputs today, but cheap insurance
 */
const tsValueToJson = (raw) => {
  let s = raw;
  // Drop ALL `as const` occurrences (inline like `["x"] as const,` and trailing).
  s = s.replace(/\s+as\s+const\b/g, "");
  // Drop `satisfies <Type>` — match the keyword and consume everything that
  // looks like a TS type expression (idents, `<…>`, `[]`, `|`, `&`, `.`, spaces)
  // until we hit a JSON-structural char (`,`, `}`, `]`) or end-of-string.
  s = s.replace(/\s+satisfies\s+[A-Za-z_$][\w$.<>|&\[\] ]*/g, "");
  // Strip line comments. Naive but safe here — our inputs are simple literals.
  s = s.replace(/\/\/[^\n]*/g, "");
  // Drop trailing commas in arrays/objects: `,]` → `]`, `,}` → `}`
  s = s.replace(/,(\s*[\]}])/g, "$1");
  // Convert single-quoted string literals to double-quoted.
  s = s.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, inner) => {
    return `"${inner.replace(/"/g, '\\"')}"`;
  });
  // Quote bare-identifier object keys: `{ top: …, variant: … }` →
  // `{ "top": …, "variant": … }`. Skip ones already quoted.
  s = s.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)/g, '$1"$2"$3');
  return s;
};

const parseTsValue = (raw) => JSON.parse(tsValueToJson(raw));

/**
 * Pull the validator's pinned constants. Names match
 * mem://features/i18n-validator-actual-exports. Throws loudly if any
 * disappear so the script fails fast instead of producing a half-stale
 * README.
 */
const loadValidatorContext = async () => {
  const supportedRaw = await readExport(
    "src/lib/lastChangeTooltipContent.ts",
    "SUPPORTED_LOCALES",
  );
  const supportedLocales = parseTsValue(supportedRaw);

  const requiredTranslationRaw = await readExport(
    "src/lib/lastChangeTooltipContent.ts",
    "REQUIRED_TRANSLATION_KEYS",
  );
  const requiredTranslation = parseTsValue(requiredTranslationRaw);

  const requiredTimeLineRaw = await readExport(
    "src/lib/lastChangeTooltipModel.ts",
    "REQUIRED_TIME_LINE_KEYS",
  );
  const requiredTimeLine = parseTsValue(requiredTimeLineRaw);

  // Cross-check the assumptions our templates rely on. If any of these
  // fail, the templates below need updating — surface clearly.
  if (!supportedLocales.includes("pl")) {
    throw new Error(
      `Templates assume "pl" is the reference locale, but SUPPORTED_LOCALES is ${JSON.stringify(supportedLocales)}`,
    );
  }
  if (!requiredTranslation.variant?.length) {
    throw new Error(
      "REQUIRED_TRANSLATION_KEYS.variant is empty — templates need at least one variant key to demonstrate missing-required-key.",
    );
  }
  if (!requiredTimeLine.length) {
    throw new Error(
      "REQUIRED_TIME_LINE_KEYS is empty — templates need at least one time-line key.",
    );
  }

  // Pick a non-reference locale that's reasonably realistic for fixtures
  // (en for ::error cases, last non-pl/en for ::warning to demonstrate
  // the fact that warnings don't gate on a specific locale).
  const nonRefLocales = supportedLocales.filter((l) => l !== "pl");
  const errorLocale = nonRefLocales.includes("en") ? "en" : nonRefLocales[0];
  const warningLocale = nonRefLocales[nonRefLocales.length - 1];

  // Pick a companion key for the same variant block so the snippet shows
  // *another* required leaf (and the missing-required-key fixture demo
  // doesn't accidentally render `{ X: ..., X: ... }` when the only sample
  // key happens to match the placeholder text we'd otherwise hardcode).
  // Falls back to a generic name when only one variant key exists.
  const companionVariantKey =
    requiredTranslation.variant[1] && requiredTranslation.variant[1] !== requiredTranslation.variant[0]
      ? requiredTranslation.variant[1]
      : "subtitle";

  // Noise key for the undeclared-key fixture: must be a name that is
  // GUARANTEED not present in any REQUIRED_TRANSLATION_KEYS bucket, otherwise
  // the snippet wouldn't actually trip `undeclared-key`.
  const allRequiredVariantKeys = new Set([
    ...requiredTranslation.top,
    ...requiredTranslation.variant,
    ...requiredTranslation.variantOptional,
  ]);
  const noiseCandidates = ["__demo_undeclared", "subheading", "tagline", "kicker"];
  const noiseKey = noiseCandidates.find((k) => !allRequiredVariantKeys.has(k)) ?? "__undeclared_demo";

  return {
    sourceFiles: {
      TRANSLATIONS: "src/lib/lastChangeTooltipContent.ts",
      TIME_LINE: "src/lib/lastChangeTooltipModel.ts",
    },
    supportedLocales,
    referenceLocale: "pl",
    errorLocale,
    warningLocale,
    sampleVariantKey: requiredTranslation.variant[0], // e.g. "description"
    companionVariantKey, // e.g. "heading" — guaranteed ≠ sampleVariantKey
    noiseKey, // guaranteed ∉ REQUIRED_TRANSLATION_KEYS
    sampleTimeLineKey: requiredTimeLine[0], // e.g. "relativeHelpTitle"
  };
};

/**
 * Build the fixture block. Returns the markdown body to be inserted
 * BETWEEN the sentinels (the script writes the sentinels back around it).
 *
 * Each fixture is a paste-into-source TS snippet — comments call out the
 * exact line that the resolver will point at, so reviewers can verify
 * `line=N` against the snippet without opening the file.
 */
const buildFixtureBlock = (ctx) => {
  const {
    sourceFiles,
    referenceLocale,
    errorLocale,
    warningLocale,
    sampleVariantKey,
    sampleTimeLineKey,
  } = ctx;

  // Bucket the timeline key into segments for natural-language phrasing.
  const timeLineLeaf = sampleTimeLineKey.split(".").pop();

  return `> ⚙️ This block is **auto-generated** by \`scripts/generate-fixture-snippets.mjs\` from the validator's real input sources (\`SUPPORTED_LOCALES\`, \`REQUIRED_TRANSLATION_KEYS\`, \`REQUIRED_TIME_LINE_KEYS\`, \`SOURCE_FILES\`). Hand-edits inside the sentinel comments are overwritten on the next run. To change a fixture, edit the templates in the script and re-run \`node scripts/generate-fixture-snippets.mjs\`. CI guard: \`npm run i18n:fixtures:check\`.

These TypeScript snippets are paste-into-source ready against \`${sourceFiles.TRANSLATIONS}\` and \`${sourceFiles.TIME_LINE}\`. Each one trips a specific \`::error\` / \`::warning\` reason — copy a snippet in, run the [Quickstart](#quickstart) command, and the matching annotation appears in stdout. (Note: this repo stores translations in TypeScript modules, not \`locales/*.json\` files — the validator reads the \`.ts\` source directly so it can resolve \`(file, line)\` for inline annotations.)

**1. Reproduces \`::error … missing-required-key\`** — \`${errorLocale}\` is missing \`local.${sampleVariantKey}\`, which is listed in \`REQUIRED_TRANSLATION_KEYS.variant\`:

\`\`\`ts
// ${sourceFiles.TRANSLATIONS}
// (Pedagogical shape — the real export is __getRawTranslationsForTesting().)
const TRANSLATIONS = {
  ${referenceLocale}: {
    local: { ${sampleVariantKey}: "<reference value>", description: "…" },
    sourcePrefix: "Źródło: ",
  },
  ${errorLocale}: {
    // ⛔ \`local.${sampleVariantKey}\` is required but absent — emitter points at the
    //    \`${errorLocale}: {\` line because the key isn't there to point at.
    local: { description: "…" },
    sourcePrefix: "Source: ",
  },
} as const;
\`\`\`

**2. Reproduces \`::error … placeholder-mismatch\`** — \`${errorLocale}\` uses \`%d\` while the reference locale uses \`{count}\`:

\`\`\`ts
// ${sourceFiles.TIME_LINE}
const TIME_LINE = {
  ${referenceLocale}: {
    relative: {
      ${timeLineLeaf}: "Zmieniono {count} minut temu", // ✅ canonical placeholder
    },
  },
  ${errorLocale}: {
    relative: {
      ${timeLineLeaf}: "Changed %d minutes ago",       // ⛔ placeholder set differs
    },
  },
} as const;
\`\`\`

**3. Reproduces \`::error … undeclared-key\`** — \`${errorLocale}\` ships a key that isn't in \`REQUIRED_TRANSLATION_KEYS\` (so other locales aren't required to translate it — usually a typo or a forgotten autofix run):

\`\`\`ts
// ${sourceFiles.TRANSLATIONS}
const TRANSLATIONS = {
  ${referenceLocale}: { local: { ${sampleVariantKey}: "<reference value>" } },
  ${errorLocale}: {
    local: {
      ${sampleVariantKey}: "<translated value>",
      // ⛔ \`subheading\` is not in REQUIRED_TRANSLATION_KEYS — drift signal.
      //    Fix: \`npm run i18n:autofix\` to register it, or delete it.
      subheading: "(uncategorised)",
    },
  },
} as const;
\`\`\`

**4. Reproduces \`::warning … empty-optional-value\`** — \`${warningLocale}\` declares an optional key but leaves the value empty (yellow marker, does NOT fail the build):

\`\`\`ts
// ${sourceFiles.TIME_LINE}
const TIME_LINE = {
  ${referenceLocale}: { relative: { ${timeLineLeaf}: "Zmieniono {count} minut temu" } },
  ${warningLocale}: {
    relative: {
      ${timeLineLeaf}: "", // ⚠️ empty string for an optional key → \`::warning\`
    },
  },
} as const;
\`\`\`

**5. Reproduces \`::error … wrong-type\`** — \`${errorLocale}\` provides a non-string value for a key that the contract declares as a \`string\`:

\`\`\`ts
// ${sourceFiles.TRANSLATIONS}
const TRANSLATIONS = {
  ${referenceLocale}: { local: { ${sampleVariantKey}: "<reference value>" } },
  ${errorLocale}: {
    // ⛔ Number where a string is expected — annotation message embeds the
    //    actual line so reviewers see \`${sampleVariantKey}: 42,\` directly.
    local: { ${sampleVariantKey}: 42 as unknown as string },
  },
} as const;
\`\`\`
`;
};

/**
 * Splice the generated block into README.md between the two sentinels.
 * If sentinels are missing, exit non-zero with a helpful message — first
 * adoption is a one-time manual step (wrap the existing fixture block).
 */
const replaceBetweenSentinels = (readme, fresh) => {
  const beginIdx = readme.indexOf(BEGIN_MARKER);
  const endIdx = readme.indexOf(END_MARKER);
  if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
    throw new Error(
      `README is missing sentinels. Wrap the auto-generated region with:\n` +
        `  ${BEGIN_MARKER}\n  …content…\n  ${END_MARKER}`,
    );
  }
  const before = readme.slice(0, beginIdx + BEGIN_MARKER.length);
  const after = readme.slice(endIdx);
  return `${before}\n\n${fresh}\n${after}`;
};

const main = async () => {
  const checkOnly = process.argv.includes("--check");

  const ctx = await loadValidatorContext();
  const fresh = buildFixtureBlock(ctx);
  const readme = await readFile(README_PATH, "utf8");
  const updated = replaceBetweenSentinels(readme, fresh);

  if (checkOnly) {
    if (updated === readme) {
      console.log("✅ README fixtures are in sync with validator inputs.");
      process.exit(0);
    }
    console.error(
      "❌ README fixtures are stale. Run `node scripts/generate-fixture-snippets.mjs` to regenerate.",
    );
    // Best-effort diff hint — show the first 5 lines that differ.
    const before = readme.split("\n");
    const after = updated.split("\n");
    let shown = 0;
    for (let i = 0; i < Math.max(before.length, after.length) && shown < 5; i++) {
      if (before[i] !== after[i]) {
        console.error(`  L${i + 1}: -${before[i] ?? ""}`);
        console.error(`  L${i + 1}: +${after[i] ?? ""}`);
        shown += 1;
      }
    }
    process.exit(1);
  }

  if (updated === readme) {
    console.log("✅ README fixtures already up to date — no changes written.");
    return;
  }
  await writeFile(README_PATH, updated, "utf8");
  console.log(
    `✅ Regenerated fixture block in README.md (locales=[${ctx.supportedLocales.join(", ")}], ` +
      `sampleVariantKey="${ctx.sampleVariantKey}", sampleTimeLineKey="${ctx.sampleTimeLineKey}").`,
  );
};

main().catch((err) => {
  console.error(`✖ ${err.message}`);
  process.exit(2);
});
